// 首页：Hero + 导入区 + 功能展示 + 隐私承诺
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, font, spacing } from '@/theme';
import { Icon } from '@/components/ui';
import { DropZone } from '@/components/home/DropZone';
import { FeatureGrid } from '@/components/home/FeatureGrid';
import { useEditor } from '@/store/editor';
import { pickFromFile } from '@/lib/pickImage';

export default function Home() {
  const router = useRouter();
  const setImage = useEditor((s) => s.setImage);
  const { width: winW } = useWindowDimensions();
  const isMobile = winW < 768;
  // native 端需要让顶部品牌栏避开状态栏 / 刘海
  const insets = useSafeAreaInsets();

  // Web 端：Cmd+V 粘贴截图直接进入编辑器
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onPaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.type.startsWith('image/')) {
          const file = it.getAsFile();
          if (!file) continue;
          const img = await pickFromFile(file);
          if (img) {
            setImage(img);
            router.push('/editor');
          }
          break;
        }
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [router, setImage]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg0 }}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top }]}
      showsVerticalScrollIndicator={false}
    >
      {/* 顶栏 */}
      <View style={styles.topbar}>
        <View style={styles.brandWrap}>
          <View style={styles.brandMark}>
            <Icon name="shield" size={18} color={colors.brand} />
          </View>
          <Text style={styles.brandName}>MosaicGuard</Text>
          <Text style={styles.brandTag}>· 隐马</Text>
        </View>
        <View style={styles.badge}>
          <View style={styles.dot} />
          <Text style={styles.badgeText}>100% 端侧处理</Text>
        </View>
      </View>

      {/* Hero */}
      <View style={[styles.hero, isMobile && { paddingTop: spacing.lg, paddingBottom: spacing.md }]}>
        <Text style={styles.kicker}>SCREENSHOT PRIVACY ENGINE</Text>
        <Text
          style={[
            styles.h1,
            isMobile && { fontSize: 34, lineHeight: 42, letterSpacing: -0.8 },
          ]}
        >
          截图里的秘密，
          {'\n'}
          交给<Text style={{ color: colors.brand }}> 隐马 </Text>抹掉。
        </Text>
        <Text style={[styles.subtitle, isMobile && { fontSize: 14, lineHeight: 22, marginTop: spacing.lg }]}>
          {isMobile
            ? 'AI 自动找出人脸、敏感号码、APP 隐藏水印——一键打码。全程在你设备上完成。'
            : '人脸、身份证号、聊天昵称、APP 截图水印——一张图里所有不想被看见的细节，AI 自动找出，一键打码。全程在你手机/电脑上完成，不会有任何字节离开设备。'}
        </Text>
      </View>

      {/* 上传区 */}
      <View style={styles.dropWrap}>
        <DropZone />
      </View>

      {/* 功能展示 */}
      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionLabel}>核心能力</Text>
          <Text style={styles.sectionTitle}>不只是一块马赛克</Text>
        </View>
        <FeatureGrid />
      </View>

      {/* 信任栏 */}
      <View style={styles.trust}>
        <View style={styles.trustItem}>
          <Icon name="shield" size={16} color={colors.brand} />
          <Text style={styles.trustText}>图片不离开设备</Text>
        </View>
        <View style={styles.trustItem}>
          <Icon name="sparkles" size={16} color={colors.brand} />
          <Text style={styles.trustText}>无登录、无追踪</Text>
        </View>
        <View style={styles.trustItem}>
          <Icon name="layers" size={16} color={colors.brand} />
          <Text style={styles.trustText}>开源算法，可审计</Text>
        </View>
      </View>

      <Text style={styles.footer}>© 2026 MosaicGuard · 一切处理均在本地完成</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing.huge,
    minHeight: '100%' as any,
    alignItems: 'center',
  },
  topbar: {
    width: '100%',
    maxWidth: 1280,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  brandWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: { color: colors.text0, fontFamily: font.family, fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
  brandTag: { color: colors.text2, fontFamily: font.family, fontSize: 14 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.bg2,
    borderWidth: 1,
    borderColor: colors.line,
  },
  dot: { width: 6, height: 6, borderRadius: 999, backgroundColor: colors.brand },
  badgeText: { color: colors.text1, fontFamily: font.mono, fontSize: 11 },

  hero: {
    width: '100%',
    maxWidth: 980,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  kicker: {
    color: colors.brand,
    fontFamily: font.mono,
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: spacing.lg,
  },
  h1: {
    color: colors.text0,
    fontFamily: font.family,
    fontSize: Platform.OS === 'web' ? 56 : 36,
    fontWeight: '800',
    lineHeight: Platform.OS === 'web' ? 64 : 44,
    letterSpacing: -1.5,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.text1,
    fontFamily: font.family,
    fontSize: 16,
    lineHeight: 26,
    marginTop: spacing.xl,
    maxWidth: 720,
    textAlign: 'center',
  },

  dropWrap: {
    width: '100%',
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xl,
    alignItems: 'center',
  },

  section: {
    width: '100%',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.huge,
    alignItems: 'center',
  },
  sectionHead: { alignItems: 'center', marginBottom: spacing.xxl, gap: 8 },
  sectionLabel: {
    color: colors.brand,
    fontFamily: font.mono,
    fontSize: 11,
    letterSpacing: 2,
  },
  sectionTitle: {
    color: colors.text0,
    fontFamily: font.family,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },

  trust: {
    flexDirection: 'row',
    gap: spacing.xxl,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: spacing.huge,
    paddingHorizontal: spacing.xl,
  },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trustText: { color: colors.text2, fontFamily: font.family, fontSize: 13 },

  footer: {
    color: colors.text3,
    fontFamily: font.mono,
    fontSize: 11,
    marginTop: spacing.huge,
  },
});
