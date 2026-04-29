import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';

const PHAddressSelector = ({ 
  selectedProvince, 
  selectedCity, 
  selectedBarangay, 
  onProvinceChange, 
  onCityChange, 
  onBarangayChange,
  errors = {}
}) => {
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [loading, setLoading] = useState({ provinces: false, cities: false, barangays: false });

  // Fetch all provinces on mount
  useEffect(() => {
    setLoading(prev => ({ ...prev, provinces: true }));
    fetch('https://psgc.gitlab.io/api/provinces/')
      .then(res => res.json())
      .then(data => {
        setProvinces(data.sort((a, b) => a.name.localeCompare(b.name)));
        setLoading(prev => ({ ...prev, provinces: false }));
      })
      .catch(err => {
        console.error('Failed to fetch provinces', err);
        setLoading(prev => ({ ...prev, provinces: false }));
      });
  }, []);

  // Fetch cities when province changes
  useEffect(() => {
    if (!selectedProvince) {
      setCities([]);
      return;
    }

    const province = provinces.find(p => p.name === selectedProvince);
    if (!province) return;

    setLoading(prev => ({ ...prev, cities: true }));
    fetch(`https://psgc.gitlab.io/api/provinces/${province.code}/cities-municipalities/`)
      .then(res => res.json())
      .then(data => {
        setCities(data.sort((a, b) => a.name.localeCompare(b.name)));
        setLoading(prev => ({ ...prev, cities: false }));
      })
      .catch(err => {
        console.error('Failed to fetch cities', err);
        setLoading(prev => ({ ...prev, cities: false }));
      });
  }, [selectedProvince, provinces]);

  // Fetch barangays when city changes
  useEffect(() => {
    if (!selectedCity) {
      setBarangays([]);
      return;
    }

    const city = cities.find(c => c.name === selectedCity);
    if (!city) return;

    setLoading(prev => ({ ...prev, barangays: true }));
    fetch(`https://psgc.gitlab.io/api/cities-municipalities/${city.code}/barangays/`)
      .then(res => res.json())
      .then(data => {
        setBarangays(data.sort((a, b) => a.name.localeCompare(b.name)));
        setLoading(prev => ({ ...prev, barangays: false }));
      })
      .catch(err => {
        console.error('Failed to fetch barangays', err);
        setLoading(prev => ({ ...prev, barangays: false }));
      });
  }, [selectedCity, cities]);

  return (
    <View style={styles.container}>
      <View style={styles.field}>
        <Text style={styles.label}>Province *</Text>
        <View style={[styles.pickerContainer, errors.province && styles.errorPicker]}>
          <Picker
            selectedValue={selectedProvince}
            onValueChange={(val) => {
              onProvinceChange(val);
              onCityChange('');
              onBarangayChange('');
            }}
            enabled={!loading.provinces}
          >
            <option label="Select Province" value="" />
            {provinces.map(p => (
              <Picker.Item key={p.code} label={p.name} value={p.name} />
            ))}
          </Picker>
          {loading.provinces && <ActivityIndicator size="small" color="#0ea5e9" style={styles.loader} />}
        </View>
        {errors.province && <Text style={styles.errorText}>{errors.province}</Text>}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>City/Municipality *</Text>
        <View style={[styles.pickerContainer, errors.city && styles.errorPicker]}>
          <Picker
            selectedValue={selectedCity}
            onValueChange={(val) => {
              onCityChange(val);
              onBarangayChange('');
            }}
            enabled={!!selectedProvince && !loading.cities}
          >
            <Picker.Item label="Select City/Municipality" value="" />
            {cities.map(c => (
              <Picker.Item key={c.code} label={c.name} value={c.name} />
            ))}
          </Picker>
          {loading.cities && <ActivityIndicator size="small" color="#0ea5e9" style={styles.loader} />}
        </View>
        {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Barangay *</Text>
        <View style={[styles.pickerContainer, errors.barangay && styles.errorPicker]}>
          <Picker
            selectedValue={selectedBarangay}
            onValueChange={(val) => onBarangayChange(val)}
            enabled={!!selectedCity && !loading.barangays}
          >
            <Picker.Item label="Select Barangay" value="" />
            {barangays.map(b => (
              <Picker.Item key={b.code} label={b.name} value={b.name} />
            ))}
          </Picker>
          {loading.barangays && <ActivityIndicator size="small" color="#0ea5e9" style={styles.loader} />}
        </View>
        {errors.barangay && <Text style={styles.errorText}>{errors.barangay}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  field: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  pickerContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    position: 'relative',
    justifyContent: 'center',
  },
  errorPicker: {
    borderColor: '#ef4444',
  },
  loader: {
    position: 'absolute',
    right: 40,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  }
});

export default PHAddressSelector;
