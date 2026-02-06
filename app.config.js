/**
 * Expo App Configuration
 * Uses EAS Secrets for Firebase credentials during cloud builds
 */
module.exports = ({ config }) => {
  // Use EAS secret path if available (during EAS Build), otherwise use local file
  const androidGoogleServicesFile = 
    process.env.GOOGLE_SERVICES_JSON || './credentials/google-services.json';
  
  const iosGoogleServicesFile = 
    process.env.GOOGLE_SERVICE_INFO_PLIST || './credentials/GoogleService-Info.plist';

  return {
    ...config,
    ios: {
      ...config.ios,
      googleServicesFile: iosGoogleServicesFile,
    },
    android: {
      ...config.android,
      googleServicesFile: androidGoogleServicesFile,
    },
  };
};
