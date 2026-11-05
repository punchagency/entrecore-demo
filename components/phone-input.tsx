import React, { useState } from 'react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

interface PhoneInputProps {
  value: string;
  onChange: (phone: string) => void;
}

const CustomPhoneInput: React.FC<PhoneInputProps> = ({ value, onChange }) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value !== "";

  return (
    <div className="relative w-full">
      <PhoneInput
        value={value}
        onChange={(phone) => onChange(phone)}
        country={'us'}
        placeholder=""
        enableSearch={true}
        disableSearchIcon={false}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        inputProps={{
          required: true,
          className: "w-full"
        }}
        specialLabel=""
        inputStyle={{
          width: '100%',
          height: '42px', // Match height of other inputs
          padding: '24px 16px 24px 52px', // Reduced vertical padding
          border: '1px solid #D1D5DB',
          borderRadius: '8px',
          backgroundColor: 'white',
          color: '#111827',
          fontSize: '16px'
        }}
        buttonStyle={{
          background: 'transparent',
          border: 'none',
          position: 'absolute',
          left: '10px',
          top: '50%',
          transform: 'translateY(-50%)',
          padding: '0',
          zIndex: 2
        }}
        dropdownStyle={{
          width: '250px',
          maxWidth: '300px',
          maxHeight: '250px',
          overflow: 'auto'
        }}
        containerStyle={{
          width: '100%',
          position: 'relative'
        }}
        enableAreaCodes={true}
        disableCountryCode={false}
        preferredCountries={['ae', 'us', 'gb', 'ca', 'au']}
        masks={{ ae: '.. ... ....' }}
      />
    {isFocused  && <label
        className={`absolute left-3 transition-all duration-200 pointer-events-none
          ${isFocused || hasValue
            ? "-top-2.5 text-xs bg-white px-1 text-gray-500"
            : "top-1/2 -translate-y-1/2 text-gray-500 left-[52px]"
          } peer-focus:-top-2.5 peer-focus:text-xs peer-focus:bg-white peer-focus:px-1 peer-focus:text-primary`}
      >
        Phone Number
      </label>}
    </div>
  );
};

export default CustomPhoneInput;