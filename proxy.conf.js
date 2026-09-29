/**
 * Routes API calls to the Spring Boot backend during development so the browser only ever talks to
 * its own origin.
 *
 * changeOrigin MUST stay false. Browsers attach an Origin header to every POST, even a same-origin
 * one. Rewriting Host to localhost:8080 while Origin still says localhost:4200 makes Spring
 * Security treat the call as cross-origin and reject it with 403 "Invalid CORS request", because
 * the backend's allowed-origin list defaults to localhost:5173. Leaving Host alone keeps Host and
 * Origin identical, so Spring sees a same-origin request and the CORS filter stays out of the way.
 */
module.exports = {
  '/api': {
    target: 'http://localhost:8080',
    secure: false,
    changeOrigin: false,
  },
};
