export const NAV_ITEMS = [
  { path: "/", label: "Home" },
  { path: "/services", label: "Services" },
  { path: "/expertise", label: "Our Areas of Expertise" },
  { path: "/blogs", label: "Blogs" },
  { path: "/about", label: "About Us" },
  { path: "/contact", label: "Contact" },
] as const;

export const CONTACT_INFO = {
  phone: "8247736253",
  email: "kasturiayurvedahyd@gmail.com",
  whatsapp: "918247736253",
  location: "Hyderabad, India",
  mapLink: "https://share.google/UNXPDbL7OxJmPxPaD",
} as const;

export const BUSINESS_HOURS = {
  morning: "10 AM – 2 PM",
  evening: "6 PM – 9 PM",
} as const;
