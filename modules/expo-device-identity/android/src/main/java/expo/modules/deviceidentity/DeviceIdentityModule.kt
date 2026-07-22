package expo.modules.deviceidentity

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.Signature
import java.security.interfaces.ECPublicKey
import java.security.spec.ECGenParameterSpec
import android.util.Base64

// Backs Elite Mobile's device-registration identity: a P-256 keypair generated inside the
// Android Keystore (StrongBox-backed when the device has a secure element) whose private key
// never leaves the hardware. The public key is what gets registered with the office; the
// private key only ever signs challenges in place.
private const val KEYSTORE_PROVIDER = "AndroidKeyStore"
private const val KEY_ALIAS = "com.eliteteams.mobile.deviceIdentity"

class KeyNotFoundException : CodedException("Device identity keypair does not exist. Call generateKeyPair first.")
class InvalidChallengeException : CodedException("Challenge must be a non-empty string.")

class DeviceIdentityModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("DeviceIdentity")

    Function("isHardwareBacked") {
      isStrongBoxAvailable()
    }

    Function("hasKeyPair") {
      loadKeyStore().containsAlias(KEY_ALIAS)
    }

    AsyncFunction("generateKeyPair") {
      deleteExistingKey()

      val generator = KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_EC, KEYSTORE_PROVIDER)
      val specBuilder = KeyGenParameterSpec.Builder(KEY_ALIAS, KeyProperties.PURPOSE_SIGN)
        .setAlgorithmParameterSpec(ECGenParameterSpec("secp256r1"))
        .setDigests(KeyProperties.DIGEST_SHA256)

      if (isStrongBoxAvailable()) {
        specBuilder.setIsStrongBoxBacked(true)
      }

      generator.initialize(specBuilder.build())
      val keyPair = generator.generateKeyPair()
      exportPublicKey(keyPair.public as ECPublicKey)
    }

    AsyncFunction("getPublicKey") {
      val entry = loadKeyStore().getEntry(KEY_ALIAS, null) as? KeyStore.PrivateKeyEntry
        ?: throw KeyNotFoundException()
      exportPublicKey(entry.certificate.publicKey as ECPublicKey)
    }

    AsyncFunction("signChallenge") { challenge: String ->
      if (challenge.isEmpty()) {
        throw InvalidChallengeException()
      }

      val entry = loadKeyStore().getEntry(KEY_ALIAS, null) as? KeyStore.PrivateKeyEntry
        ?: throw KeyNotFoundException()

      val signature = Signature.getInstance("SHA256withECDSA")
      signature.initSign(entry.privateKey)
      signature.update(challenge.toByteArray(Charsets.UTF_8))
      Base64.encodeToString(signature.sign(), Base64.NO_WRAP)
    }

    AsyncFunction("deleteKeyPair") {
      deleteExistingKey()
    }
  }

  private fun loadKeyStore(): KeyStore {
    val keyStore = KeyStore.getInstance(KEYSTORE_PROVIDER)
    keyStore.load(null)
    return keyStore
  }

  private fun deleteExistingKey() {
    val keyStore = loadKeyStore()
    if (keyStore.containsAlias(KEY_ALIAS)) {
      keyStore.deleteEntry(KEY_ALIAS)
    }
  }

  private fun exportPublicKey(publicKey: ECPublicKey): String {
    // X9.62 uncompressed point encoding (0x04 || X || Y), matching the iOS
    // SecKeyCopyExternalRepresentation format for a P-256 public key.
    val fieldSize = 32
    val x = toFixedWidth(publicKey.w.affineX.toByteArray(), fieldSize)
    val y = toFixedWidth(publicKey.w.affineY.toByteArray(), fieldSize)
    val point = ByteArray(1 + fieldSize * 2)
    point[0] = 0x04
    System.arraycopy(x, 0, point, 1, fieldSize)
    System.arraycopy(y, 0, point, 1 + fieldSize, fieldSize)
    return Base64.encodeToString(point, Base64.NO_WRAP)
  }

  private fun toFixedWidth(bytes: ByteArray, width: Int): ByteArray {
    // BigInteger.toByteArray() may include a leading sign byte or be shorter than the field
    // width; normalize to exactly `width` bytes, left-padded with zeros.
    val trimmed = if (bytes.size > width) bytes.copyOfRange(bytes.size - width, bytes.size) else bytes
    if (trimmed.size == width) return trimmed
    val padded = ByteArray(width)
    System.arraycopy(trimmed, 0, padded, width - trimmed.size, trimmed.size)
    return padded
  }

  private fun isStrongBoxAvailable(): Boolean {
    val context = appContext.reactContext ?: return false
    return context.packageManager.hasSystemFeature(android.content.pm.PackageManager.FEATURE_STRONGBOX_KEYSTORE)
  }
}
