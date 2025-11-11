import React from 'react';

interface ErrorMessageProps {
  message?: string;
  errors?: string[];
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, errors }) => {
  if (!message && (!errors || errors.length === 0)) {
    return null;
  }

  return (
    <div style={{
      backgroundColor: '#fee',
      border: '1px solid #fcc',
      borderRadius: '4px',
      padding: '12px',
      marginBottom: '16px',
      color: '#c33'
    }}>
      {message && <div style={{ fontWeight: 'bold', marginBottom: errors && errors.length > 0 ? '8px' : '0' }}>{message}</div>}
      {errors && errors.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          {errors.map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

interface FieldErrorProps {
  error?: string;
}

export const FieldError: React.FC<FieldErrorProps> = ({ error }) => {
  if (!error) return null;

  return (
    <div style={{
      color: '#c33',
      fontSize: '0.875rem',
      marginTop: '4px'
    }}>
      {error}
    </div>
  );
};
