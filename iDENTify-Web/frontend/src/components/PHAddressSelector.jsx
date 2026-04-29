import React, { useState, useEffect } from 'react';

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
    <div className="ph-address-selector">
      <div className="request-grid two-col">
        <div className="request-field">
          <label>Province *</label>
          <select 
            value={selectedProvince} 
            onChange={(e) => {
              onProvinceChange(e.target.value);
              onCityChange('');
              onBarangayChange('');
            }}
            className={errors.province ? 'error' : ''}
            disabled={loading.provinces}
          >
            <option value="">Select Province</option>
            {provinces.map(p => (
              <option key={p.code} value={p.name}>{p.name}</option>
            ))}
          </select>
          {errors.province && <span className="error-message">{errors.province}</span>}
        </div>
        <div className="request-field">
          <label>City/Municipality *</label>
          <select 
            value={selectedCity} 
            onChange={(e) => {
              onCityChange(e.target.value);
              onBarangayChange('');
            }}
            className={errors.city ? 'error' : ''}
            disabled={!selectedProvince || loading.cities}
          >
            <option value="">Select City/Municipality</option>
            {cities.map(c => (
              <option key={c.code} value={c.name}>{c.name}</option>
            ))}
          </select>
          {errors.city && <span className="error-message">{errors.city}</span>}
        </div>
      </div>
      <div className="request-grid two-col" style={{ marginTop: '15px' }}>
        <div className="request-field">
          <label>Barangay *</label>
          <select 
            value={selectedBarangay} 
            onChange={(e) => onBarangayChange(e.target.value)}
            className={errors.barangay ? 'error' : ''}
            disabled={!selectedCity || loading.barangays}
          >
            <option value="">Select Barangay</option>
            {barangays.map(b => (
              <option key={b.code} value={b.name}>{b.name}</option>
            ))}
          </select>
          {errors.barangay && <span className="error-message">{errors.barangay}</span>}
        </div>
      </div>
    </div>
  );
};

export default PHAddressSelector;
