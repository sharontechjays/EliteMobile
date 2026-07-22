import ExpoModulesCore
import Security

// Backs Elite Mobile's device-registration identity: a P-256 keypair generated inside the
// Secure Enclave (when available) whose private key never leaves the chip. The public key is
// what gets registered with the office; the private key only ever signs challenges in place.
private let keyTag = "com.eliteteams.mobile.deviceIdentity".data(using: .utf8)!

enum DeviceIdentityError: Error, CustomStringConvertible {
  case keyGenerationFailed(String)
  case keyNotFound
  case signingFailed(String)
  case invalidChallenge

  var description: String {
    switch self {
    case .keyGenerationFailed(let message): return "Key generation failed: \(message)"
    case .keyNotFound: return "No device identity keypair has been generated yet"
    case .signingFailed(let message): return "Signing failed: \(message)"
    case .invalidChallenge: return "Challenge must be a UTF-8 string"
    }
  }
}

public class DeviceIdentityModule: Module {
  public func definition() -> ModuleDefinition {
    Name("DeviceIdentity")

    // Whether this device can back the private key with the Secure Enclave itself (vs. a
    // software-only fallback the simulator and older devices use).
    Function("isHardwareBacked") { () -> Bool in
      SecureEnclave.isAvailable
    }

    Function("hasKeyPair") { () -> Bool in
      (try? Self.loadPrivateKey()) != nil
    }

    // Generates a fresh P-256 keypair, replacing any existing one, and returns the public key
    // as base64-encoded X9.63 uncompressed point bytes — this is what gets sent to the office
    // for the pending -> approved device-registration flow.
    AsyncFunction("generateKeyPair") { () throws -> String in
      try Self.deleteExistingKey()

      guard
        let access = SecAccessControlCreateWithFlags(
          nil,
          kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
          .privateKeyUsage,
          nil
        )
      else {
        throw DeviceIdentityError.keyGenerationFailed("could not create access control policy")
      }

      var attributes: [String: Any] = [
        kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
        kSecAttrKeySizeInBits as String: 256,
        kSecPrivateKeyAttrs as String: [
          kSecAttrIsPermanent as String: true,
          kSecAttrApplicationTag as String: keyTag,
          kSecAttrAccessControl as String: access as Any,
        ],
      ]

      if SecureEnclave.isAvailable {
        attributes[kSecAttrTokenID as String] = kSecAttrTokenIDSecureEnclave
      }

      var error: Unmanaged<CFError>?
      guard let privateKey = SecKeyCreateRandomKey(attributes as CFDictionary, &error) else {
        throw DeviceIdentityError.keyGenerationFailed(
          error?.takeRetainedValue().localizedDescription ?? "unknown error"
        )
      }

      guard let publicKey = SecKeyCopyPublicKey(privateKey) else {
        throw DeviceIdentityError.keyGenerationFailed("could not derive public key")
      }

      return try Self.exportPublicKey(publicKey)
    }

    AsyncFunction("getPublicKey") { () throws -> String in
      let privateKey = try Self.loadPrivateKey()
      guard let publicKey = SecKeyCopyPublicKey(privateKey) else {
        throw DeviceIdentityError.keyGenerationFailed("could not derive public key")
      }
      return try Self.exportPublicKey(publicKey)
    }

    // Signs a server-issued challenge (nonce) with the on-device private key. The signature is
    // DER-encoded ECDSA-over-SHA256, base64-encoded for transport.
    AsyncFunction("signChallenge") { (challenge: String) throws -> String in
      guard let messageData = challenge.data(using: .utf8) else {
        throw DeviceIdentityError.invalidChallenge
      }

      let privateKey = try Self.loadPrivateKey()
      var error: Unmanaged<CFError>?
      guard
        let signature = SecKeyCreateSignature(
          privateKey,
          .ecdsaSignatureMessageX962SHA256,
          messageData as CFData,
          &error
        )
      else {
        throw DeviceIdentityError.signingFailed(
          error?.takeRetainedValue().localizedDescription ?? "unknown error"
        )
      }

      return (signature as Data).base64EncodedString()
    }

    AsyncFunction("deleteKeyPair") { () throws in
      try Self.deleteExistingKey()
    }
  }

  private static func loadPrivateKey() throws -> SecKey {
    let query: [String: Any] = [
      kSecClass as String: kSecClassKey,
      kSecAttrApplicationTag as String: keyTag,
      kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
      kSecReturnRef as String: true,
    ]

    var item: CFTypeRef?
    let status = SecItemCopyMatching(query as CFDictionary, &item)
    guard status == errSecSuccess, let key = item else {
      throw DeviceIdentityError.keyNotFound
    }
    // swiftlint:disable:next force_cast
    return (key as! SecKey)
  }

  private static func deleteExistingKey() throws {
    let query: [String: Any] = [
      kSecClass as String: kSecClassKey,
      kSecAttrApplicationTag as String: keyTag,
      kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
    ]
    let status = SecItemDelete(query as CFDictionary)
    guard status == errSecSuccess || status == errSecItemNotFound else {
      throw DeviceIdentityError.keyGenerationFailed("could not clear previous key (\(status))")
    }
  }

  private static func exportPublicKey(_ publicKey: SecKey) throws -> String {
    var error: Unmanaged<CFError>?
    guard let data = SecKeyCopyExternalRepresentation(publicKey, &error) else {
      throw DeviceIdentityError.keyGenerationFailed(
        error?.takeRetainedValue().localizedDescription ?? "unknown error"
      )
    }
    return (data as Data).base64EncodedString()
  }
}

private enum SecureEnclave {
  static var isAvailable: Bool {
    var error: Unmanaged<CFError>?
    let access = SecAccessControlCreateWithFlags(
      nil,
      kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
      .privateKeyUsage,
      &error
    )
    guard access != nil else { return false }

    let probeAttributes: [String: Any] = [
      kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
      kSecAttrKeySizeInBits as String: 256,
      kSecAttrTokenID as String: kSecAttrTokenIDSecureEnclave,
      kSecPrivateKeyAttrs as String: [
        kSecAttrIsPermanent as String: false,
        kSecAttrAccessControl as String: access as Any,
      ],
    ]

    guard SecKeyCreateRandomKey(probeAttributes as CFDictionary, &error) != nil else {
      return false
    }
    return true
  }
}
