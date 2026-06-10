import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Kök dizindeki tek seferlik bakım/teşhis scriptleri (CommonJS, uygulama dışı).
    "check-users.js",
    "get-policies.js",
  ]),
  {
    // `react-hooks/set-state-in-effect`: bir bağımlılık (örn. user/profile)
    // değiştiğinde state'i sıfırlama, bu projede yaygın ve geçerli bir desen.
    // Hata yerine uyarı olarak işaretlenir — kodu kırmaz, sadece bilgilendirir.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
