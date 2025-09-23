module.exports = function (api) {
  api.cache(true);
  let plugins = [
    "react-native-reanimated/plugin",
    "react-native-worklets/plugin",
    [
      "module:react-native-dotenv",
      {
        "moduleName": "@env",
        "path": ".env",
        safe: false,
        allowUndefined: true,
      }
    ]
  ];

  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],

    plugins,
  };
};
