module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    'react-native-safe-area-context': '<rootDir>/__mocks__/react-native-safe-area-context.js',
    '@react-native-async-storage/async-storage': '<rootDir>/__mocks__/@react-native-async-storage/async-storage.js',
    'react-native-gesture-handler': '<rootDir>/__mocks__/react-native-gesture-handler.js',
  },
}
