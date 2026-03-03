import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React from "react";

export default function VerifyEmailScreen() {
  return (
    <View style={styles.container}>
      <Ionicons name="mail-open-outline" size={80} color="#1B93D5" />

      <Text style={styles.title}>Check Your Email</Text>
      <Text style={styles.subtitle}>
        We sent you a verification link. Please verify your account to continue.
      </Text>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Open Email App</Text>
      </TouchableOpacity>

      <TouchableOpacity>
        <Text style={styles.resendText}>Resend Verification Email</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F8FF",
    padding: 25,
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1B1D29",
    marginTop: 20,
  },

  subtitle: {
    textAlign: "center",
    marginTop: 10,
    fontSize: 15,
    color: "#6A6A6A",
    marginBottom: 25,
    paddingHorizontal: 20,
    lineHeight: 20,
  },

  button: {
    backgroundColor: "#1B93D5",
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },

  resendText: {
    marginTop: 20,
    color: "#1B93D5",
    fontWeight: "700",
  },
});
