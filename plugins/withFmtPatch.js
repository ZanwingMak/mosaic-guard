// Expo Config Plugin：往 prebuild 出来的 Podfile 里注入一段 post_install hook，
// 自动 patch Pods/fmt/include/fmt/base.h —— 解决 RN 0.76 自带的 fmt 在
// Xcode 16+/Clang 17+ 严格 consteval 下编译失败的问题。
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// 直接写到 Podfile post_install 块里的 Ruby 代码
const PATCH_BLOCK = `
    # MosaicGuard：自动 patch fmt 以适配 Xcode 16+/Clang 17+
    fmt_base = File.join(__dir__, 'Pods/fmt/include/fmt/base.h')
    if File.exist?(fmt_base)
      content = File.read(fmt_base)
      unless content.include?('// MOSAIC_GUARD_FMT_PATCH')
        patched = content.sub(
          /\\/\\/ Detect consteval.*?^#endif$\\s*^#if FMT_USE_CONSTEVAL.*?^#endif$/m,
          "// MOSAIC_GUARD_FMT_PATCH\\n#define FMT_USE_CONSTEVAL 0\\n#define FMT_CONSTEVAL\\n#define FMT_CONSTEXPR20"
        )
        File.chmod(0o644, fmt_base)
        File.write(fmt_base, patched)
      end
    end
`;

module.exports = function withFmtPatch(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      if (!fs.existsSync(podfilePath)) return cfg;
      let content = fs.readFileSync(podfilePath, 'utf8');
      // 已经注入过就不重复
      if (content.includes('MOSAIC_GUARD_FMT_PATCH')) return cfg;
      // 把 patch 插入到 react_native_post_install(...) 调用之后
      const re = /(react_native_post_install\([\s\S]*?\)\s*\n)/;
      if (re.test(content)) {
        content = content.replace(re, `$1${PATCH_BLOCK}\n`);
      } else {
        // 兜底：直接追加到文件末尾的 post_install 块（罕见路径）
        content += `\n${PATCH_BLOCK}\n`;
      }
      fs.writeFileSync(podfilePath, content);
      return cfg;
    },
  ]);
};
