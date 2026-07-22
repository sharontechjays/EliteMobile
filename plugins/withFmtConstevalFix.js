const { withPodfile } = require("@expo/config-plugins");

// Newer Clang's stricter `consteval` rules break fmt's FMT_STRING macro on the fmt version
// bundled by this React Native release. fmt's base.h has no `#ifndef` guard around
// FMT_USE_CONSTEVAL, so a compiler -D flag gets silently clobbered by the header's own
// unconditional #define — patch the header text directly in post_install instead. This has to
// be a config plugin (not a manual Podfile edit) because `expo prebuild` fully regenerates
// ios/Podfile from scratch every time, wiping any hand edits.
const MARKER = "# fmt FMT_USE_CONSTEVAL patch (via withFmtConstevalFix plugin)";
const ANCHOR = "post_install do |installer|";

function withFmtConstevalFix(config) {
  return withPodfile(config, (config) => {
    const contents = config.modResults.contents;
    if (contents.includes(MARKER)) {
      return config;
    }
    if (!contents.includes(ANCHOR)) {
      throw new Error("withFmtConstevalFix: could not find post_install anchor in Podfile");
    }
    const patch = `${ANCHOR}
    ${MARKER}
    fmt_base_header = File.join(installer.sandbox.pod_dir('fmt'), 'include', 'fmt', 'base.h')
    if File.exist?(fmt_base_header)
      File.chmod(0644, fmt_base_header)
      fmt_contents = File.read(fmt_base_header)
      fmt_patched = fmt_contents.gsub(/#\\s*define\\s+FMT_USE_CONSTEVAL\\s+1/, '#define FMT_USE_CONSTEVAL 0')
      File.write(fmt_base_header, fmt_patched) if fmt_patched != fmt_contents
    end
`;
    config.modResults.contents = contents.replace(ANCHOR, patch);
    return config;
  });
}

module.exports = withFmtConstevalFix;
