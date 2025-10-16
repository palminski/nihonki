module.exports = function (api) {
  api.cache(true);
  let plugins = [
    ["react-native-reanimated/plugin", {}, 'reanimated-from-conf'],
    ["react-native-worklets/plugin", {}, 'worklet-from-conf'],
  ];

  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],

    plugins,
  };
};
