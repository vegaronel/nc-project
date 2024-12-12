const checkAuth = (req, res, next) => {
  if (!req.isAuthenticated()) { // Check if user is not authenticated
    if (!req.session.redirectTo || req.originalUrl==='/dashboard') { 
      req.session.redirectTo = req.originalUrl; // Save the original URL only once
    }
    req.url = req.originalUrl
    
    return res.redirect(`/login?redirectedTo=${req.originalUrl}`); // Redirect to login
  }
  next(); // Proceed if authenticated
};

export default checkAuth;
