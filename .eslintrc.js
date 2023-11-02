module.exports = {
  env: {
    browser: true,
    es2021: true,
    jest: true
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      rules: {
        'no-undef': 'off'
      }
    }
  ],
  extends: [
    'eslint:recommended',
    'airbnb',
    'airbnb/hooks',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier'
  ],
  plugins: ['react', '@typescript-eslint', 'import', 'jsx-a11y'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  settings: {
    'import/resolver': {
      typescript: {alwaysTryTypes: true}
    },
    'import/parsers': {'@typescript-eslint/parser': ['.ts', '.tsx']}
  },
  rules: {
    '@typescript-eslint/no-dupe-class-members': ['error'],
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-empty-interface': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-non-null-assertion': ['error'],
    '@typescript-eslint/no-redeclare': 'off',
    '@typescript-eslint/no-shadow': 'off',
    '@typescript-eslint/no-unused-vars': ['error', {argsIgnorePattern: '^_'}],
    '@typescript-eslint/no-useless-constructor': ['error'],
    'arrow-body-style': 'off',
    'class-methods-use-this': 'off',
    'consistent-return': 'off',
    'default-param-last': 'off',
    'func-names': 'off',
    'import/extensions': ['error', 'ignorePackages', {ts: 'never', tsx: 'never'}],
    'import/no-cycle': 'off',
    'import/no-useless-path-segments': 'off',
    'import/prefer-default-export': 'off',
    'jsx-a11y/accessible-emoji': 'off',
    'jsx-a11y/alt-text': 'off',
    'jsx-a11y/anchor-has-content': 'off',
    'jsx-a11y/anchor-is-valid': 'off',
    'jsx-a11y/aria-role': 'off',
    'jsx-a11y/click-events-have-key-events': 'off',
    'jsx-a11y/control-has-associated-label': 'off',
    'jsx-a11y/img-redundant-alt': 'off',
    'jsx-a11y/label-has-associated-control': 'off',
    'jsx-a11y/label-has-for': 'off',
    'jsx-a11y/no-autofocus': 'off',
    'jsx-a11y/no-noninteractive-element-interactions': 'off',
    'jsx-a11y/no-noninteractive-tabindex': 'off',
    'jsx-a11y/no-static-element-interactions': 'off',
    'lines-between-class-members': ['error', 'always', {exceptAfterSingleLine: true}],
    'max-classes-per-file': 'off',
    'max-len': ['error', {code: 120, tabWidth: 2}],
    'no-console': 'off',
    'no-dupe-class-members': 'off',
    'no-else-return': 'off',
    'no-empty-function': 'off',
    'no-empty': 'off',
    'no-lone-blocks': 'off',
    'no-nested-ternary': 'off',
    'no-new-wrappers': 'off',
    'no-param-reassign': 'off',
    'no-plusplus': 'off',
    'no-redeclare': 'off',
    'no-shadow': 'off',
    'no-underscore-dangle': ['error', {allow: ['__typename']}],
    'no-unsafe-optional-chaining': 'off',
    'no-unused-expressions': ['error', {allowShortCircuit: true}],
    'no-unused-vars': 'off',
    'no-use-before-define': 'off',
    'no-useless-constructor': 'off',
    'object-curly-spacing': 'off',
    'prefer-destructuring': ['error', {AssignmentExpression: {array: false}}],
    'react-hooks/exhaustive-deps': 'off',
    'react-hooks/rules-of-hooks': 'off',
    'react/destructuring-assignment': 'off',
    'react/function-component-definition': 'off',
    'react/jsx-filename-extension': [1, {extensions: ['.jsx', '.tsx']}],
    'react/jsx-no-bind': 'off',
    'react/jsx-no-constructed-context-values': 'off',
    'react/jsx-no-useless-fragment': ['error', {allowExpressions: true}],
    'react/jsx-props-no-spreading': 'off',
    'react/jsx-uses-react': 'off',
    'react/no-array-index-key': 'off',
    'react/no-danger': 'off',
    'react/no-unstable-nested-components': ['error', {allowAsProps: true}],
    'react/no-unused-prop-types': 'off',
    'react/require-default-props': 'off',
    'react/display-name': 'off',
    'no-restricted-syntax': [
      'error',
      {
        selector: 'ForInStatement',
        message: 'for..in loops iterate over the entire prototype chain, which is virtually never what you want. ' +
           'Use Object.{keys,values,entries}, and iterate over the resulting array.',
      },
      {
        selector: 'LabeledStatement',
        message: 'Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand.',
      },
      {
        selector: 'WithStatement',
        message: '`with` is disallowed in strict mode because it makes code impossible to predict and optimize.',
      },
    ],
    semi: ['error', 'never']
  }
}
