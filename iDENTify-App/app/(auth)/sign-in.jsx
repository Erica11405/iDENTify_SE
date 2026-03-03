import { useSignIn } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import React from "react";

export default function Page() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);

  const onSignInPress = async () => {
    if (!isLoaded) return;

    try {
      const cleanIdentifier = emailAddress.trim().toLowerCase();

      const signInAttempt = await signIn.create({
        identifier: cleanIdentifier,
        password: password,
      });

      if (signInAttempt.status === "complete") {
        await setActive({ session: signInAttempt.createdSessionId });
        router.replace("/");
      } else {
        console.error(JSON.stringify(signInAttempt, null, 2));
      }
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          <Text style={styles.title}>Welcome to</Text>
          <Text style={styles.logoname}>iDENTify</Text>

          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={emailAddress}
            placeholder="Enter email"
            style={styles.input}
            onChangeText={setEmailAddress}
          />

          <View style={styles.passwordContainer}>
            <TextInput
              value={password}
              placeholder="Enter password"
              secureTextEntry={!showPassword}
              style={[styles.input, styles.passwordInput]}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={showPassword ? "eye-off" : "eye"}
                size={24}
                color="#666"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={onSignInPress} style={styles.button}>
            <Text style={styles.buttonText}>Sign In</Text>
          </TouchableOpacity>

          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Don't have an account?</Text>
            <Link href="/sign-up">
              <Text style={styles.signupLink}>Sign up</Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 26,
    justifyContent: "center",
    backgroundColor: "#EEF4FF",
  },

  title: {
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
    color: "#2A2A2A",
    marginBottom: 4,
  },

  logoname: {
    fontSize: 52,
    fontWeight: "900",
    textAlign: "center",
    color: "#1A7FCC",
    letterSpacing: 1,
    marginBottom: 35,
  },

  input: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
    fontSize: 16,
    borderColor: "#D3DDEE",
    borderWidth: 1.3,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
  },

  /* New Password Styles */
  passwordContainer: {
    width: "100%",
    position: "relative",
  },
  passwordInput: {
    paddingRight: 50, // Space for the eye icon
  },
  eyeIcon: {
    position: "absolute",
    right: 16,
    top: 14, // Aligned with input padding
    zIndex: 1,
  },

  button: {
    backgroundColor: "#1A7FCC",
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
  },

  buttonText: {
    color: "white",
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  signupRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 22,
  },

  signupText: {
    color: "#666",
    fontSize: 15,
  },

  signupLink: {
    marginLeft: 5,
    color: "#1A7FCC",
    fontWeight: "700",
    fontSize: 15,
  },
});