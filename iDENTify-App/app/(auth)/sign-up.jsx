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
  
//   // New Birthdate State
//   const [birthdate, setBirthdate] = useState("");

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
//       Alert.alert("Error", "Please enter your birthdate.");
//       return;
//     }

//     // Validate Date Format (YYYY-MM-DD)
//     const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
//     if (!dateRegex.test(birthdate.trim())) {
//       Alert.alert("Invalid Format", "Please enter your birthdate in YYYY-MM-DD format (e.g., 1995-08-25).");
//       return;
//     }

//     // Calculate Age
//     const today = new Date();
//     const birthDateObj = new Date(birthdate.trim());
//     let age = today.getFullYear() - birthDateObj.getFullYear();
//     const monthDifference = today.getMonth() - birthDateObj.getMonth();
    
//     // Adjust age if the birthday hasn't occurred yet this year
//     if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDateObj.getDate())) {
//         age--;
//     }

//     // Age Requirement Check (Must be 18 or older)
//     if (age < 18) {
//         Alert.alert("Age Requirement", "You must be at least 18 years old to create an account.");
//         return;
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
//               birthdate: birthdate.trim(), // Sent to your database
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
//             placeholder="Birthdate (YYYY-MM-DD)"
//             placeholderTextColor="#9CA3AF"
//             onChangeText={setBirthdate}
//             style={styles.input}
//             keyboardType="numbers-and-punctuation"
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
  Alert,
  Modal,
  Pressable,
} from "react-native";
import { useSignUp } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { API } from "../../constants/Api";
import DateTimePicker from '@react-native-community/datetimepicker';

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();

  // Split Name State
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  
  // Birthdate State with Date Picker
  const [birthdate, setBirthdate] = useState("");
  const [dateObject, setDateObject] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sex, setSex] = useState("");
  const [phone, setPhone] = useState("");
  const [showSexModal, setShowSexModal] = useState(false);

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");

  const onChangeDate = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) {
      setDateObject(selectedDate);
      setBirthdate(selectedDate.toISOString().split('T')[0]); // Formats to YYYY-MM-DD
    }
  };

  // Step 1: Create Account in Clerk & Send Email
  const onSignUpPress = async () => {
    if (!isLoaded) return;

    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert("Error", "Please enter your first and last name.");
      return;
    }

    if (!birthdate.trim()) {
      Alert.alert("Error", "Please select your birthdate.");
      return;
    }

    // Validate Date Format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(birthdate.trim())) {
      Alert.alert("Invalid Format", "Please select a valid birthdate.");
      return;
    }

    // Calculate Age
    const today = new Date();
    const birthDateObj = new Date(birthdate.trim());
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const monthDifference = today.getMonth() - birthDateObj.getMonth();
    
    // Adjust age if the birthday hasn't occurred yet this year
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDateObj.getDate())) {
        age--;
    }

    // Age Requirement Check (Must be 18 or older)
    if (age < 18) {
        Alert.alert("Age Requirement", "You must be at least 18 years old to create an account.");
        return;
    }

    if (!sex.trim()) {
      Alert.alert("Missing Information", "Please select your sex.");
      return;
    }

    if (!phone.trim()) {
      Alert.alert("Missing Information", "Please enter your phone number.");
      return;
    }

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
              birthdate: birthdate.trim(), // Sent to your database
              address: "Update your profile",
              contact_number: phone.trim(),
              gender: sex
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.container}>
          <Text style={styles.verifyTitle}>Verify your email</Text>
          <Text style={styles.subtitle}>Enter the code sent to {emailAddress}</Text>

          <TextInput
            value={code}
            placeholder="Enter verification code"
            placeholderTextColor="#9CA3AF"
            onChangeText={setCode}
            style={styles.input}
            keyboardType="number-pad"
          />

          <TouchableOpacity style={styles.button} onPress={onVerifyPress}>
            <Text style={styles.buttonText}>Verify</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

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
          <Text style={styles.appName}>iDENTify</Text>
          <Text style={styles.title}>Create Account</Text>

          <TextInput
            value={firstName}
            placeholder="First Name"
            placeholderTextColor="#9CA3AF"
            onChangeText={setFirstName}
            style={styles.input}
          />

          <TextInput
            value={middleName}
            placeholder="Middle Name (Optional)"
            placeholderTextColor="#9CA3AF"
            onChangeText={setMiddleName}
            style={styles.input}
          />

          <TextInput
            value={lastName}
            placeholder="Last Name"
            placeholderTextColor="#9CA3AF"
            onChangeText={setLastName}
            style={styles.input}
          />

          <TouchableOpacity style={styles.inputPicker} onPress={() => setShowDatePicker(true)}>
            <Text style={{ color: birthdate ? '#1E293B' : '#9CA3AF', fontSize: 16 }}>
              {birthdate || "Select Birthdate"}
            </Text>
            <Ionicons name="calendar-outline" size={20} color="#9CA3AF" style={styles.pickerIcon} />
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={dateObject}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onChangeDate}
              maximumDate={new Date()}
            />
          )}

          {Platform.OS === 'ios' && showDatePicker && (
            <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.iosDoneBtn}>
              <Text style={{ color: 'white', fontWeight: '600' }}>Done</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.inputPicker} onPress={() => setShowSexModal(true)}>
            <Text style={{ color: sex ? '#1E293B' : '#9CA3AF', fontSize: 16 }}>
              {sex || "Select Sex"}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#9CA3AF" style={styles.pickerIcon} />
          </TouchableOpacity>

          <TextInput
            value={phone}
            placeholder="Phone Number"
            placeholderTextColor="#9CA3AF"
            onChangeText={setPhone}
            style={styles.input}
            keyboardType="phone-pad"
          />

          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={emailAddress}
            placeholder="Enter email"
            placeholderTextColor="#9CA3AF"
            onChangeText={setEmailAddress}
            style={styles.input}
          />

          <View style={styles.passwordContainer}>
            <TextInput
              value={password}
              placeholder="Enter password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showPassword}
              onChangeText={setPassword}
              style={[styles.input, styles.passwordInput]}
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

      <Modal
        animationType="fade"
        transparent={true}
        visible={showSexModal}
        onRequestClose={() => setShowSexModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowSexModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Sex</Text>
            {['Male', 'Female'].map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.modalOption}
                onPress={() => {
                  setSex(option);
                  setShowSexModal(false);
                }}
              >
                <Text style={styles.modalOptionText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 26,
    justifyContent: "center",
    backgroundColor: "#EEF4FF",
    paddingTop: 40,
    paddingBottom: 40,
  },
  appName: {
    fontSize: 52,
    fontWeight: "900",
    textAlign: "center",
    color: "#1A7FCC",
    marginBottom: 5,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    color: "#2A2A2A",
    marginBottom: 35,
  },
  verifyTitle: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    color: "#1A7FCC",
    marginBottom: 10,
  },
  subtitle: {
    textAlign: "center",
    color: "#666",
    marginBottom: 20
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
  inputPicker: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
    borderColor: "#D3DDEE",
    borderWidth: 1.3,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    justifyContent: 'center',
    height: 52, // Roughly matches the TextInput height
  },
  pickerIcon: {
    position: 'absolute',
    right: 16,
    top: 14,
  },
  iosDoneBtn: {
    alignSelf: 'flex-end',
    backgroundColor: '#1A7FCC',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  passwordContainer: {
    width: "100%",
    position: "relative",
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeIcon: {
    position: "absolute",
    right: 16,
    top: 14,
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
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 22,
  },
  footerText: {
    color: "#555",
  },
  link: {
    marginLeft: 5,
    color: "#1A7FCC",
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
    color: "#1E293B",
  },
  modalOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalOptionText: {
    fontSize: 16,
    textAlign: "center",
    color: "#1A7FCC",
    fontWeight: "600",
  },
});