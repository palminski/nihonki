module.exports = function (api) {
  api.cache(true);
  let plugins = [
    "react-native-reanimated/plugin",
    ["react-native-worklets/plugin"],
  ];

  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],

    plugins,
  };
};
