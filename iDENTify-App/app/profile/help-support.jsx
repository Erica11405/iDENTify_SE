import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";

export default function HelpSupport() {
  const router = useRouter();
  const [expandedFAQ, setExpandedFAQ] = useState(null);

  const faqs = [
    {
      id: 1,
      question: "How do I book an appointment?",
      answer:
        "Navigate to the Appointments tab, tap 'Book Appointment', and follow the steps to select a doctor, service, and date/time that works for you.",
    },
    {
      id: 2,
      question: "How can I view my dental records?",
      answer:
        "Go to the Records tab to access your full dental history, X-rays, treatments, and medical alerts in one place.",
    },
    {
      id: 3,
      question: "How do I manage family members?",
      answer:
        "In your Profile tab, select 'Family Members' to add or manage records for family members under one account.",
    },
    {
      id: 4,
      question: "Can I cancel or reschedule appointments?",
      answer:
        "Yes, visit the Appointments tab, select an appointment, and use the reschedule or cancel options available.",
    },
    {
      id: 5,
      question: "How does the queue system work?",
      answer:
        "Check the Queue tab to see your position in line. You'll get notifications when it's your turn.",
    },
    {
      id: 6,
      question: "Is my personal data secure?",
      answer:
        "Your data is encrypted and secured according to healthcare standards. We never share your information without consent.",
    },
  ];

  const toggleFAQ = (id) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={28} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* INTRO SECTION */}
      <View style={styles.introCard}>
        <View style={styles.iconContainer}>
          <Ionicons name="help-circle" size={48} color="#D97706" />
        </View>
        <Text style={styles.introTitle}>We're Here to Help!</Text>
        <Text style={styles.introText}>
          Find answers to common questions or contact our support team for
          assistance.
        </Text>
      </View>

      {/* FAQ SECTION */}
      <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>

      <View style={styles.faqContainer}>
        {faqs.map((faq) => (
          <View key={faq.id}>
            <TouchableOpacity
              style={styles.faqItem}
              onPress={() => toggleFAQ(faq.id)}
              activeOpacity={0.7}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                <Ionicons
                  name={expandedFAQ === faq.id ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#D97706"
                />
              </View>
              {expandedFAQ === faq.id && (
                <Text style={styles.faqAnswer}>{faq.answer}</Text>
              )}
            </TouchableOpacity>
            {faq.id !== faqs.length && <View style={styles.divider} />}
          </View>
        ))}
      </View>

      {/* CONTACT SECTION */}
      <Text style={styles.sectionTitle}>Contact Us</Text>

      <View style={styles.contactContainer}>
        <TouchableOpacity style={styles.contactCard}>
          <View style={[styles.contactIconBox, { backgroundColor: "#E0F2FE" }]}>
            <Ionicons name="mail-outline" size={24} color="#0284C7" />
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>Email</Text>
            <Text style={styles.contactValue}>@identify-app.com</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.contactCard}>
          <View style={[styles.contactIconBox, { backgroundColor: "#F0FDF4" }]}>
            <Ionicons name="call-outline" size={24} color="#16A34A" />
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>Phone</Text>
            <Text style={styles.contactValue}>+23 (0912) 345-6789</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* <TouchableOpacity style={styles.contactCard}>
          <View style={[styles.contactIconBox, { backgroundColor: "#FDF2F8" }]}>
            <Ionicons name="chatbubble-outline" size={24} color="#DB2777" />
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>Live Chat</Text>
            <Text style={styles.contactValue}>Available 9 AM - 6 PM EST</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
        </TouchableOpacity>*/}
      </View>

      {/* TIPS SECTION */}
      <Text style={styles.sectionTitle}>Helpful Tips</Text>

      <View style={styles.tipsContainer}>
        <View style={styles.tipItem}>
          <View style={styles.tipIconBox}>
            <Ionicons name="bulb-outline" size={20} color="#1B93D5" />
          </View>
          <Text style={styles.tipText}>
            Keep your profile up-to-date for better appointment scheduling
          </Text>
        </View>

        <View style={styles.tipItem}>
          <View style={styles.tipIconBox}>
            <Ionicons name="notifications-outline" size={20} color="#1B93D5" />
          </View>
          <Text style={styles.tipText}>
            Enable notifications to receive appointment reminders
          </Text>
        </View>

        <View style={styles.tipItem}>
          <View style={styles.tipIconBox}>
            <Ionicons name="document-outline" size={20} color="#1B93D5" />
          </View>
          <Text style={styles.tipText}>
            Review your dental records regularly for your health
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  contentContainer: {
    padding: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },

  /* HEADER */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
    paddingTop: 8,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1E293B",
    flex: 1,
    textAlign: "center",
  },

  /* INTRO CARD */
  introCard: {
    backgroundColor: "#FEF3C7",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 32,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  iconContainer: {
    marginBottom: 16,
  },
  introTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#92400E",
    marginBottom: 8,
    textAlign: "center",
  },
  introText: {
    fontSize: 14,
    color: "#B45309",
    textAlign: "center",
    lineHeight: 20,
  },

  /* SECTION TITLES */
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#94A3B8",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  /* FAQ */
  faqContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    paddingVertical: 8,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  faqItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    flex: 1,
    lineHeight: 20,
  },
  faqAnswer: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 12,
    lineHeight: 20,
    paddingRight: 24,
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
  },

  /* CONTACT */
  contactContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    paddingVertical: 8,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  contactIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#94A3B8",
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },

  /* TIPS */
  tipsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  tipItem: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tipIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#F0F9FF",
    justifyContent: "center",
    alignItems: "center",
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: "#475569",
    fontWeight: "500",
    lineHeight: 18,
  },
});
