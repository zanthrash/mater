const React = require('react')
const { View } = require('react-native')

const GestureHandlerRootView = ({ children, style }) =>
  React.createElement(View, { style }, children)

const Swipeable = React.forwardRef(({ children }, _ref) =>
  React.createElement(View, null, children)
)

module.exports = {
  GestureHandlerRootView,
  Swipeable,
  PanGestureHandler: View,
  TapGestureHandler: View,
  LongPressGestureHandler: View,
  FlingGestureHandler: View,
  RectButton: View,
  BorderlessButton: View,
  BaseButton: View,
  TouchableOpacity: require('react-native').TouchableOpacity,
  TouchableHighlight: require('react-native').TouchableHighlight,
  TouchableWithoutFeedback: require('react-native').TouchableWithoutFeedback,
  TouchableNativeFeedback: require('react-native').TouchableNativeFeedback,
  ScrollView: require('react-native').ScrollView,
  FlatList: require('react-native').FlatList,
  Switch: require('react-native').Switch,
  TextInput: require('react-native').TextInput,
  DrawerLayout: View,
  NativeViewGestureHandler: View,
  State: {
    UNDETERMINED: 0,
    FAILED: 1,
    BEGAN: 2,
    CANCELLED: 3,
    ACTIVE: 4,
    END: 5,
  },
  Directions: {
    RIGHT: 1,
    LEFT: 2,
    UP: 4,
    DOWN: 8,
  },
}
