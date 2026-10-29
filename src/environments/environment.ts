export const environment = {
  production: true,
  apiBaseUrl: '/api/v1',
  /**
   * Address printed in the book QR codes. Once books are printed it can never change, so set it
   * to the final domain before printing. Empty: the address the admin is browsing from.
   */
  siteUrl: 'https://education-platform-front.vercel.app',
  showDemoCredentials: false,
};
