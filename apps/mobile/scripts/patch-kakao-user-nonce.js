const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

const patches = [
  {
    file: 'node_modules/@react-native-kakao/user/src/index.ts',
    replacements: [
      [
        `export function login({
  serviceTerms,
  prompts,
  useKakaoAccountLogin,
  scopes,
}: {`,
        `export function login({
  serviceTerms,
  prompts,
  useKakaoAccountLogin,
  scopes,
  web,
}: {`,
      ],
      [
        `    scopes ?? [],
  );`,
        `    scopes ?? [],
    web?.nonce,
  );`,
      ],
    ],
  },
  {
    file: 'node_modules/@react-native-kakao/user/src/spec/NativeKakaoUser.ts',
    replacements: [
      [
        `    useKakaoAccountLogin: boolean,
    scopes?: string[],
  ): Promise<KakaoLoginToken>;`,
        `    useKakaoAccountLogin: boolean,
    scopes?: string[],
    nonce?: string,
  ): Promise<KakaoLoginToken>;`,
      ],
    ],
  },
  {
    file: 'node_modules/@react-native-kakao/user/lib/module/index.js',
    replacements: [
      [
        `  useKakaoAccountLogin,
  scopes
} = {}) {`,
        `  useKakaoAccountLogin,
  scopes,
  web
} = {}) {`,
      ],
      [
        `  return Native.login(serviceTerms ?? [], prompts ?? [], useKakaoAccountLogin ?? false, scopes ?? []);
}`,
        `  return Native.login(serviceTerms ?? [], prompts ?? [], useKakaoAccountLogin ?? false, scopes ?? [], web?.nonce);
}`,
      ],
    ],
  },
  {
    file: 'node_modules/@react-native-kakao/user/lib/commonjs/index.js',
    replacements: [
      [
        `  useKakaoAccountLogin,
  scopes
} = {}) {`,
        `  useKakaoAccountLogin,
  scopes,
  web
} = {}) {`,
      ],
      [
        `  return Native.login(serviceTerms ?? [], prompts ?? [], useKakaoAccountLogin ?? false, scopes ?? []);
}`,
        `  return Native.login(serviceTerms ?? [], prompts ?? [], useKakaoAccountLogin ?? false, scopes ?? [], web?.nonce);
}`,
      ],
    ],
  },
  {
    file: 'node_modules/@react-native-kakao/user/lib/typescript/src/index.d.ts',
    replacements: [
      [
        `export declare function login({ serviceTerms, prompts, useKakaoAccountLogin, scopes, }?: {`,
        `export declare function login({ serviceTerms, prompts, useKakaoAccountLogin, scopes, web, }?: {`,
      ],
    ],
  },
  {
    file: 'node_modules/@react-native-kakao/user/android/src/main/java/net/mjstudio/rnkakao/user/RNCKakaoUserModule.kt',
    replacements: [
      [
        `    useKakaoAccountLogin: Boolean,
    scopes: ReadableArray?,
    promise: Promise,`,
        `    useKakaoAccountLogin: Boolean,
    scopes: ReadableArray?,
    nonce: String?,
    promise: Promise,`,
      ],
      [
        `        context,
        scopes = scopes.filterIsInstance<String>(),
        callback = callback,`,
        `        context,
        scopes = scopes.filterIsInstance<String>(),
        nonce = nonce,
        callback = callback,`,
      ],
      [
        `        context,
        serviceTerms = serviceTerms?.filterIsInstance<String>()?.ifEmpty { null },
        callback = callback,`,
        `        context,
        nonce = nonce,
        serviceTerms = serviceTerms?.filterIsInstance<String>()?.ifEmpty { null },
        callback = callback,`,
      ],
      [
        `            }?.ifEmpty { null },
        serviceTerms = serviceTerms?.filterIsInstance<String>()?.ifEmpty { null },
        callback = callback,`,
        `            }?.ifEmpty { null },
        nonce = nonce,
        serviceTerms = serviceTerms?.filterIsInstance<String>()?.ifEmpty { null },
        callback = callback,`,
      ],
    ],
  },
  {
    file: 'node_modules/@react-native-kakao/user/android/src/oldarch/KakaoUserSpec.kt',
    replacements: [
      [
        `    useKakaoAccountLogin: Boolean,
    scopes: ReadableArray?,
    promise: Promise,`,
        `    useKakaoAccountLogin: Boolean,
    scopes: ReadableArray?,
    nonce: String?,
    promise: Promise,`,
      ],
    ],
  },
];

for (const patch of patches) {
  const filePath = path.join(root, patch.file);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Kakao nonce patch target is missing: ${patch.file}`);
  }

  let source = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  for (const [before, after] of patch.replacements) {
    if (source.includes(after)) continue;
    if (!source.includes(before)) {
      throw new Error(`Kakao nonce patch did not match ${patch.file}`);
    }
    source = source.replace(before, after);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, source);
    console.log(`[patch-kakao-user-nonce] patched ${patch.file}`);
  }
}
