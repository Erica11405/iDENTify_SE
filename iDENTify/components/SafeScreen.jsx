import { View } from "react-native";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SafeScreen = ({ children }) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        paddingTop: insets.top > 0 ? insets.top - 10 : 10, // small space
        paddingBottom: 0,
        paddingLeft: 0,
        paddingRight: 0,
      }}
    >
      {children}
    </View>
  );
};

export default SafeScreen;
