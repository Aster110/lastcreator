import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
	baseDirectory: __dirname,
});

// §8b 数据层抽象铁律（v4.0 ESLint 落地，对应决策 7）
// SQL 字符串只允许在 src/lib/repo/* 和 src/lib/db/*；其他位置抽 repo 函数。
// 详见：mylife/2-Projects/P101-hackon/19-v3.9-情感闭环与记忆.md §8b
const eslintConfig = [
	...compat.extends("next/core-web-vitals", "next/typescript"),
	// 全局禁 .prepare(...)（业务层禁 SQL）
	{
		files: ["src/**/*.{ts,tsx}"],
		rules: {
			"no-restricted-syntax": [
				"error",
				{
					selector: "CallExpression[callee.property.name='prepare']",
					message:
						"§8b 铁律：SQL 只允许在 src/lib/repo/* 和 src/lib/db/*。请抽到 repo 函数后再调。",
				},
			],
		},
	},
	// repo + db 层放行
	{
		files: ["src/lib/repo/**/*.ts", "src/lib/db/**/*.ts"],
		rules: { "no-restricted-syntax": "off" },
	},
	// v4.0 grandfathered：identity/events 内嵌 SQL 早于 §8b 铁律。
	// TODO(v4.x): 抽到 src/lib/repo/{users,events}.ts，移除豁免。
	{
		files: ["src/lib/identity/**/*.ts", "src/lib/events/**/*.ts"],
		rules: { "no-restricted-syntax": "off" },
	},
];

export default eslintConfig;
