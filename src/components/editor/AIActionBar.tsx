// AI 操作浮条：根据当前 tool 显示对应的"扫描"按钮 + 检测结果摘要 + 应用到选中
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Button, Icon } from '@/components/ui';
import { colors, font, radius, spacing } from '@/theme';
import { useEditor } from '@/store/editor';

interface Props {
  scanning?: boolean;
  detectionCount: number;
  selectedCount: number;
  onScan: () => void;
  onApply: () => void;
  onClear: () => void;
  scanSummary?: string;
}

export function AIActionBar({
  scanning,
  detectionCount,
  selectedCount,
  onScan,
  onApply,
  onClear,
  scanSummary,
}: Props) {
  const tool = useEditor((s) => s.tool);
  const isSmart = tool === 'smart';
  const label =
    tool === 'smart'
      ? '一键智选全图'
      : tool === 'face'
      ? '扫描人脸'
      : tool === 'ocr'
      ? '识别敏感文字'
      : tool === 'watermark'
      ? '检测隐藏水印'
      : '扫描';
  const tip =
    tool === 'smart'
      ? '识别所有文字行 + 人脸；点击任一框即可立刻打码，再点撤销'
      : tool === 'face'
      ? '识别画面中所有人脸，逐个勾选要打码的对象'
      : tool === 'ocr'
      ? '自动捕捉身份证 / 手机号 / 银行卡 / 邮箱 / 车牌 / 订单流水号 等'
      : '基于 LSB 位平面与频域能量分析，找出可能的隐藏水印区域';

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.icon}>
          <Icon
            name={
              tool === 'smart'
                ? 'wand'
                : tool === 'face'
                ? 'face'
                : tool === 'ocr'
                ? 'text'
                : 'eye'
            }
            size={18}
            color={colors.brand}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{label}</Text>
          <Text style={styles.tip}>{tip}</Text>
        </View>
        <Button
          label={scanning ? '识别中…' : detectionCount > 0 ? '重新扫描' : label}
          onPress={onScan}
          variant="primary"
          size="sm"
          loading={scanning}
        />
      </View>

      {detectionCount > 0 && (
        <View style={styles.resultRow}>
          <Text style={styles.resultText}>
            {isSmart ? (
              <>
                发现 <Text style={{ color: colors.brand, fontWeight: '700' }}>{detectionCount}</Text> 个候选区域，
                已打码 <Text style={{ color: colors.brand, fontWeight: '700' }}>{selectedCount}</Text> 个
                <Text style={{ color: colors.text3 }}>　·　点击任一框即可打码，再点撤销</Text>
              </>
            ) : (
              <>
                发现 <Text style={{ color: colors.brand, fontWeight: '700' }}>{detectionCount}</Text> 个候选区域，
                已选中 <Text style={{ color: colors.brand, fontWeight: '700' }}>{selectedCount}</Text> 个
              </>
            )}
          </Text>
          {scanSummary ? <Text style={styles.summary}>{scanSummary}</Text> : null}
          <View style={styles.actions}>
            <Button label="清除检测" variant="ghost" size="sm" onPress={onClear} />
            {!isSmart && (
              <Button
                label={`打码选中 (${selectedCount})`}
                variant="primary"
                size="sm"
                onPress={onApply}
                disabled={selectedCount === 0}
              />
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.bg1,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    padding: spacing.lg,
    gap: spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: colors.text0, fontFamily: font.family, fontSize: 14, fontWeight: '700' },
  tip: { color: colors.text2, fontFamily: font.family, fontSize: 12, marginTop: 2 },
  resultRow: { gap: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.line },
  resultText: { color: colors.text1, fontFamily: font.family, fontSize: 13 },
  summary: { color: colors.text3, fontFamily: font.mono, fontSize: 11 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
});
