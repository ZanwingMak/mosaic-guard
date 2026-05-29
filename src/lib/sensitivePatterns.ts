// 敏感信息匹配规则：从 OCR 文本中识别需要打码的内容
// 每条规则：name 中文标签 + regex + 可选校验函数

export interface SensitiveMatch {
  type: string;        // 类型标签（如 "身份证号"）
  text: string;        // 命中片段
  start: number;       // 在原文中的起始下标
  end: number;
}

interface Rule {
  type: string;
  regex: RegExp;
  validate?: (m: string) => boolean;
}

// 中国大陆 18 位身份证校验码
function validateChineseID(id: string): boolean {
  if (!/^\d{17}[\dXx]$/.test(id)) return false;
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checks = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += parseInt(id[i], 10) * weights[i];
  return checks[sum % 11] === id[17].toUpperCase();
}

// Luhn 校验：银行卡号
function luhn(num: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let n = parseInt(num[i], 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

const rules: Rule[] = [
  {
    type: '身份证号',
    regex: /\b\d{17}[\dXx]\b/g,
    validate: validateChineseID,
  },
  {
    type: '手机号',
    regex: /(?<!\d)1[3-9]\d{9}(?!\d)/g,
  },
  {
    type: '银行卡号',
    regex: /(?<!\d)\d{13,19}(?!\d)/g,
    validate: luhn,
  },
  {
    type: '邮箱',
    regex: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
  },
  {
    type: '车牌号',
    // 普通车牌 + 新能源
    regex:
      /\b[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼][A-HJ-NP-Z][A-HJ-NP-Z0-9]{4,6}\b/g,
  },
  {
    type: 'IPv4',
    regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    validate: (s) => s.split('.').every((p) => Number(p) >= 0 && Number(p) <= 255),
  },
  // 订单号 / 流水号 / 系统 ID 通用规则：
  // 长 ≥10 的连续字母数字串，且**必须同时包含字母与数字**（排除纯数字时间戳/纯英文单词）。
  // 这样既能抓 USR12842NOkJBaj21779868107 这种订单号，
  // 又不会跟身份证/银行卡/手机号产生 4 框重叠（那些是纯数字，被 validate 排除）。
  {
    type: '订单/流水号',
    regex: /(?<![A-Za-z0-9])[A-Za-z0-9]{10,}(?![A-Za-z0-9])/g,
    validate: (s) => /\d/.test(s) && /[A-Za-z]/.test(s),
  },
];

/** 扫描文本，返回所有命中的敏感片段 */
export function scanSensitive(text: string): SensitiveMatch[] {
  const out: SensitiveMatch[] = [];
  const seen = new Set<string>(); // 去重：相同 text+start
  for (const rule of rules) {
    rule.regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rule.regex.exec(text)) !== null) {
      const matched = m[0];
      if (rule.validate && !rule.validate(matched)) continue;
      // QQ/银行卡/手机号同长度冲突：让先匹配的优先（rules 顺序即优先级）
      const key = `${matched}@${m.index}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ type: rule.type, text: matched, start: m.index, end: m.index + matched.length });
    }
  }
  return out;
}
