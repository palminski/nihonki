module.exports = function (api) {
  api.cache(true);
  // react-native-reanimated v4 bundles worklets handling internally, so the separate
  // react-native-worklets/plugin is redundant here — running both is a documented
  // anti-pattern for this combination, not something the app's own code needs either way
  // (nothing in this codebase uses reanimated/worklets APIs directly).
  let plugins = [
    ["react-native-reanimated/plugin", {}, 'reanimated-from-conf'],
  ];

  return {
    // NativeWind's jsxImportSource routed every JSX element through its interop wrapper
    // regardless of whether it used `className` — now that nothing in the app does,
    // dropping this entirely means zero NativeWind involvement in compilation at all.
    presets: [['babel-preset-expo']],

    plugins,
  };
};
