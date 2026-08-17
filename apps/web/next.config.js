/** @type {import('next').NextConfig} */
const webpack = require('webpack');

const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    // @coinbase/cdp-sdk (pulled in via @rainbow-me/rainbowkit -> wagmi ->
    // @wagmi/connectors -> @base-org/account) references @x402/* subpaths
    // that are not published to npm. We don't use the base account connector,
    // so ignore them.
    config.plugins.push(new webpack.IgnorePlugin({
      resourceRegExp: /^@x402\//,
    }));
    return config;
  },
};

module.exports = nextConfig;
