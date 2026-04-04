// import { useState } from "react";
// import {
//   Text,
//   TextInput,
//   TouchableOpacity,
//   View,
//   ScrollView,
//   KeyboardAvoidingView,
//   Platform,
//   StyleSheet,
//   Alert
// } from "react-native";
// import { useSignUp } from "@clerk/clerk-expo";
// import { Link, useRouter } from "expo-router";
// import { Ionicons } from "@expo/vector-icons";
// import { API } from "../../constants/Api";

// export default function SignUpScreen() {
//   const { isLoaded, signUp, setActive } = useSignUp();
//   const router = useRouter();

//   // Split Name State
//   const [firstName, setFirstName] = useState("");
//   const [middleName, setMiddleName] = useState("");
//   const [lastName, setLastName] = useState("");
//   const [birthdate, setBirthdate] = useState(""); // Added birthdate state

//   const [emailAddress, setEmailAddress] = useState("");
//   const [password, setPassword] = useState("");
//   const [showPassword, setShowPassword] = useState(false);
//   const [pendingVerification, setPendingVerification] = useState(false);
//   const [code, setCode] = useState("");

//   // Step 1: Create Account in Clerk & Send Email
//   const onSignUpPress = async () => {
//     if (!isLoaded) return;

//     if (!firstName.trim() || !lastName.trim()) {
//       Alert.alert("Error", "Please enter your first and last name.");
//       return;
//     }

//     if (!birthdate.trim()) {
//       Alert.alert("Error", "Please enter your birthdate (YYYY-MM-DD).");
//       return;
//     }

//     // Age validation check (Must be at least 18)
//     const dob = new Date(birthdate);
//     if (isNaN(dob.getTime())) {
//       Alert.alert("Invalid Date", "Please format your birthdate as YYYY-MM-DD.");
//       return;
//     }
//     const ageDifMs = Date.now() - dob.getTime();
//     const ageDate = new Date(ageDifMs);
//     const age = Math.abs(ageDate.getUTCFullYear() - 1970);

//     if (age < 18) {
//       Alert.alert("Age Requirement", "You must be at least 18 years old to create an account.");
//       return;
//     }

//     try {
//       await signUp.create({
//         emailAddress: emailAddress.trim(),
//         password,
//         firstName: firstName.trim(),
//         lastName: lastName.trim(),
//       });

//       await signUp.prepareEmailAddressVerification({
//         strategy: "email_code",
//       });

//       setPendingVerification(true);
//     } catch (err) {
//       console.error("Sign Up Error:", err);
//       Alert.alert("Sign Up Error", err.errors ? err.errors[0].message : "Something went wrong");
//     }
//   };

//   // Step 2: Verify Email & Create Patient in MySQL Database
//   const onVerifyPress = async () => {
//     if (!isLoaded) return;

//     try {
//       const signUpAttempt = await signUp.attemptEmailAddressVerification({
//         code,
//       });

//       if (signUpAttempt.status === "complete") {

//         // --- BACKEND CONNECTION START ---
//         try {
//           const res = await fetch(API.patients, {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({
//               first_name: firstName.trim(),
//               middle_name: middleName.trim(),
//               last_name: lastName.trim(),
//               email: emailAddress.trim(),
//               birthdate: birthdate.trim(), // Send birthdate to backend
//               address: "Update your profile",
//               contact_number: "",
//               gender: "Unspecified"
//             })
//           });

//           if (!res.ok) {
//             console.error("Failed to create patient in DB");
//             Alert.alert("Notice", "Account created, but profile setup failed. Please contact support.");
//           }
//         } catch (dbError) {
//           console.error("Database Error:", dbError);
//           Alert.alert("Connection Error", "Could not connect to clinic server.");
//         }
//         // --- BACKEND CONNECTION END ---

//         await setActive({ session: signUpAttempt.createdSessionId });
//         router.replace("/");
//       } else {
//         Alert.alert("Verification Failed", "Please check your code and try again.");
//       }
//     } catch (err) {
//       console.error("Verification Error:", err);
//       Alert.alert("Error", "Verification failed.");
//     }
//   };

//   if (pendingVerification) {
//     return (
//       <KeyboardAvoidingView
//         style={{ flex: 1 }}
//         behavior={Platform.OS === "ios" ? "padding" : "height"}
//       >
//         <View style={styles.container}>
//           <Text style={styles.verifyTitle}>Verify your email</Text>
//           <Text style={styles.subtitle}>Enter the code sent to {emailAddress}</Text>

//           <TextInput
//             value={code}
//             placeholder="Enter verification code"
//             placeholderTextColor="#9CA3AF"
//             onChangeText={setCode}
//             style={styles.input}
//             keyboardType="number-pad"
//           />

//           <TouchableOpacity style={styles.button} onPress={onVerifyPress}>
//             <Text style={styles.buttonText}>Verify</Text>
//           </TouchableOpacity>
//         </View>
//       </KeyboardAvoidingView>
//     );
//   }

//   return (
//     <KeyboardAvoidingView
//       style={{ flex: 1 }}
//       behavior={Platform.OS === "ios" ? "padding" : "height"}
//     >
//       <ScrollView
//         contentContainerStyle={{ flexGrow: 1 }}
//         keyboardShouldPersistTaps="handled"
//       >
//         <View style={styles.container}>
//           <Text style={styles.appName}>iDENTify</Text>
//           <Text style={styles.title}>Create Account</Text>

//           <TextInput
//             value={firstName}
//             placeholder="First Name"
//             placeholderTextColor="#9CA3AF"
//             onChangeText={setFirstName}
//             style={styles.input}
//           />

//           <TextInput
//             value={middleName}
//             placeholder="Middle Name (Optional)"
//             placeholderTextColor="#9CA3AF"
//             onChangeText={setMiddleName}
//             style={styles.input}
//           />

//           <TextInput
//             value={lastName}
//             placeholder="Last Name"
//             placeholderTextColor="#9CA3AF"
//             onChangeText={setLastName}
//             style={styles.input}
//           />

//           <TextInput
//             value={birthdate}
//             placeholder="Date of Birth (YYYY-MM-DD)"
//             placeholderTextColor="#9CA3AF"
//             onChangeText={setBirthdate}
//             style={styles.input}
//           />

//           <TextInput
//             autoCapitalize="none"
//             autoCorrect={false}
//             keyboardType="email-address"
//             value={emailAddress}
//             placeholder="Enter email"
//             placeholderTextColor="#9CA3AF"
//             onChangeText={setEmailAddress}
//             style={styles.input}
//           />

//           <View style={styles.passwordContainer}>
//             <TextInput
//               value={password}
//               placeholder="Enter password"
//               placeholderTextColor="#9CA3AF"
//               secureTextEntry={!showPassword}
//               onChangeText={setPassword}
//               style={[styles.input, styles.passwordInput]}
//               autoCapitalize="none"
//               autoCorrect={false}
//             />
//             <TouchableOpacity
//               onPress={() => setShowPassword(!showPassword)}
//               style={styles.eyeIcon}
//               hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
//             >
//               <Ionicons
//                 name={showPassword ? "eye-off" : "eye"}
//                 size={24}
//                 color="#666"
//               />
//             </TouchableOpacity>
//           </View>

//           <TouchableOpacity style={styles.button} onPress={onSignUpPress}>
//             <Text style={styles.buttonText}>Sign Up</Text>
//           </TouchableOpacity>

//           <View style={styles.footerRow}>
//             <Text style={styles.footerText}>Already have an account?</Text>
//             <Link href="/sign-in">
//               <Text style={styles.link}>Sign In</Text>
//             </Link>
//           </View>
//         </View>
//       </ScrollView>
//     </KeyboardAvoidingView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     paddingHorizontal: 26,
//     justifyContent: "center",
//     backgroundColor: "#EEF4FF",
//     paddingTop: 40,
//     paddingBottom: 40,
//   },
//   appName: {
//     fontSize: 52,
//     fontWeight: "900",
//     textAlign: "center",
//     color: "#1A7FCC",
//     marginBottom: 5,
//   },
//   title: {
//     fontSize: 26,
//     fontWeight: "700",
//     textAlign: "center",
//     color: "#2A2A2A",
//     marginBottom: 35,
//   },
//   verifyTitle: {
//     fontSize: 28,
//     fontWeight: "700",
//     textAlign: "center",
//     color: "#1A7FCC",
//     marginBottom: 10,
//   },
//   subtitle: {
//     textAlign: "center",
//     color: "#666",
//     marginBottom: 20
//   },
//   input: {
//     width: "100%",
//     backgroundColor: "#FFFFFF",
//     paddingVertical: 14,
//     paddingHorizontal: 16,
//     marginBottom: 16,
//     borderRadius: 14,
//     fontSize: 16,
//     borderColor: "#D3DDEE",
//     borderWidth: 1.3,
//     elevation: 1,
//     shadowColor: "#000",
//     shadowOpacity: 0.07,
//     shadowOffset: { width: 0, height: 2 },
//     shadowRadius: 3,
//   },
//   passwordContainer: {
//     width: "100%",
//     position: "relative",
//   },
//   passwordInput: {
//     paddingRight: 50,
//   },
//   eyeIcon: {
//     position: "absolute",
//     right: 16,
//     top: 14,
//     zIndex: 1,
//   },
//   button: {
//     backgroundColor: "#1A7FCC",
//     paddingVertical: 15,
//     borderRadius: 14,
//     marginTop: 10,
//     elevation: 2,
//     shadowColor: "#000",
//     shadowOpacity: 0.15,
//     shadowOffset: { width: 0, height: 3 },
//     shadowRadius: 6,
//   },
//   buttonText: {
//     color: "white",
//     fontSize: 18,
//     fontWeight: "700",
//     textAlign: "center",
//   },
//   footerRow: {
//     flexDirection: "row",
//     justifyContent: "center",
//     marginTop: 22,
//   },
//   footerText: {
//     color: "#555",
//   },
//   link: {
//     marginLeft: 5,
//     color: "#1A7FCC",
//     fontWeight: "700",
//   },
// });

import { useState } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert
} from "react-native";
import { useSignUp } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { API } from "../../constants/Api";

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();

  // Split Name State
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthdate, setBirthdate] = useState(""); // ADDED STATE

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");

  // Step 1: Create Account in Clerk & Send Email
  const onSignUpPress = async () => {
    if (!isLoaded) return;

    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert("Error", "Please enter your first and last name.");
      return;
    }

    if (!birthdate.trim()) {
      Alert.alert("Error", "Please enter your birthdate (YYYY-MM-DD).");
      return;
    }

    // --- AGE REQUIREMENT VALIDATION ---
    const dob = new Date(birthdate);
    if (isNaN(dob.getTime())) {
      Alert.alert("Invalid Date", "Please format your birthdate as YYYY-MM-DD.");
      return;
    }
    const ageDifMs = Date.now() - dob.getTime();
    const ageDate = new Date(ageDifMs);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);

    if (age < 18) {
      Alert.alert("Age Requirement", "You must be at least 18 years old to create an account.");
      return;
    }
    // -----------------------------------

    try {
      await signUp.create({
        emailAddress: emailAddress.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });

      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });

      setPendingVerification(true);
    } catch (err) {
      console.error("Sign Up Error:", err);
      Alert.alert("Sign Up Error", err.errors ? err.errors[0].message : "Something went wrong");
    }
  };

  // Step 2: Verify Email & Create Patient in MySQL Database
  const onVerifyPress = async () => {
    if (!isLoaded) return;

    try {
      const signUpAttempt = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (signUpAttempt.status === "complete") {

        // --- BACKEND CONNECTION START ---
        try {
          const res = await fetch(API.patients, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              first_name: firstName.trim(),
              middle_name: middleName.trim(),
              last_name: lastName.trim(),
              email: emailAddress.trim(),
              birthdate: birthdate.trim(), // PASSED TO DB
              address: "Update your profile",
              contact_number: "",
              gender: "Unspecified"
            })
          });

          if (!res.ok) {
            console.error("Failed to create patient in DB");
            Alert.alert("Notice", "Account created, but profile setup failed. Please contact support.");
          }
        } catch (dbError) {
          console.error("Database Error:", dbError);
          Alert.alert("Connection Error", "Could not connect to clinic server.");
        }
        // --- BACKEND CONNECTION END ---

        await setActive({ session: signUpAttempt.createdSessionId });
        router.replace("/");
      } else {
        Alert.alert("Verification Failed", "Please check your code and try again.");
      }
    } catch (err) {
      console.error("Verification Error:", err);
      Alert.alert("Error", "Verification failed.");
    }
  };

  if (pendingVerification) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.container}>
          <Text style={styles.verifyTitle}>Verify your email</Text>
          <Text style={styles.subtitle}>Enter the code sent to {emailAddress}</Text>
          <TextInput value={code} placeholder="Enter verification code" placeholderTextColor="#9CA3AF" onChangeText={setCode} style={styles.input} keyboardType="number-pad" />
          <TouchableOpacity style={styles.button} onPress={onVerifyPress}>
            <Text style={styles.buttonText}>Verify</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          <Text style={styles.appName}>iDENTify</Text>
          <Text style={styles.title}>Create Account</Text>

          <TextInput value={firstName} placeholder="First Name" placeholderTextColor="#9CA3AF" onChangeText={setFirstName} style={styles.input} />
          <TextInput value={middleName} placeholder="Middle Name (Optional)" placeholderTextColor="#9CA3AF" onChangeText={setMiddleName} style={styles.input} />
          <TextInput value={lastName} placeholder="Last Name" placeholderTextColor="#9CA3AF" onChangeText={setLastName} style={styles.input} />
          
          {/* ADDED BIRTHDATE FIELD */}
          <TextInput value={birthdate} placeholder="Date of Birth (YYYY-MM-DD)" placeholderTextColor="#9CA3AF" onChangeText={setBirthdate} style={styles.input} />

          <TextInput autoCapitalize="none" autoCorrect={false} keyboardType="email-address" value={emailAddress} placeholder="Enter email" placeholderTextColor="#9CA3AF" onChangeText={setEmailAddress} style={styles.input} />

          <View style={styles.passwordContainer}>
            <TextInput value={password} placeholder="Enter password" placeholderTextColor="#9CA3AF" secureTextEntry={!showPassword} onChangeText={setPassword} style={[styles.input, styles.passwordInput]} autoCapitalize="none" autoCorrect={false} />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name={showPassword ? "eye-off" : "eye"} size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.button} onPress={onSignUpPress}>
            <Text style={styles.buttonText}>Sign Up</Text>
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <Link href="/sign-in">
              <Text style={styles.link}>Sign In</Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 26, justifyContent: "center", backgroundColor: "#EEF4FF", paddingTop: 40, paddingBottom: 40 },
  appName: { fontSize: 52, fontWeight: "900", textAlign: "center", color: "#1A7FCC", marginBottom: 5 },
  title: { fontSize: 26, fontWeight: "700", textAlign: "center", color: "#2A2A2A", marginBottom: 35 },
  verifyTitle: { fontSize: 28, fontWeight: "700", textAlign: "center", color: "#1A7FCC", marginBottom: 10 },
  subtitle: { textAlign: "center", color: "#666", marginBottom: 20 },
  input: { width: "100%", backgroundColor: "#FFFFFF", paddingVertical: 14, paddingHorizontal: 16, marginBottom: 16, borderRadius: 14, fontSize: 16, borderColor: "#D3DDEE", borderWidth: 1.3, elevation: 1, shadowColor: "#000", shadowOpacity: 0.07, shadowOffset: { width: 0, height: 2 }, shadowRadius: 3 },
  passwordContainer: { width: "100%", position: "relative" },
  passwordInput: { paddingRight: 50 },
  eyeIcon: { position: "absolute", right: 16, top: 14, zIndex: 1 },
  button: { backgroundColor: "#1A7FCC", paddingVertical: 15, borderRadius: 14, marginTop: 10, elevation: 2, shadowColor: "#000", shadowOpacity: 0.15, shadowOffset: { width: 0, height: 3 }, shadowRadius: 6 },
  buttonText: { color: "white", fontSize: 18, fontWeight: "700", textAlign: "center" },
  footerRow: { flexDirection: "row", justifyContent: "center", marginTop: 22 },
  footerText: { color: "#555" },
  link: { marginLeft: 5, color: "#1A7FCC", fontWeight: "700" },
});