export default ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    apiBaseUrl: process.env.API_BASE_URL ?? config.extra?.apiBaseUrl ?? 'http://localhost:3000',
  },
})
