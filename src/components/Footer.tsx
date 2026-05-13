import { Link } from "react-router-dom";
import { Phone, Mail, MapPin } from "lucide-react";
import { ASSETS } from "@/constants/assets";
import { CONTACT_INFO, NAV_ITEMS, BUSINESS_HOURS } from "@/constants/navigation";

const Footer = () => {
  return (
    <footer className="bg-[#f5f0e8] border-t border-border mt-20">
      <div className="container mx-auto py-12 px-5 md:py-20 md:px-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Link to="/" className="flex items-center gap-3 mb-4">
              <img src={ASSETS.logo} alt="" className="h-12 w-12 rounded-full object-cover object-center border-2 border-primary/20" aria-hidden="true" />
              <span className="font-serif text-lg font-semibold text-foreground">Kasturi Ayurveda</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Healing the natural way with authentic Ayurvedic practices.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              {NAV_ITEMS.slice(0, 5).map((item) => (
                <li key={item.path}>
                  <Link to={item.path} className="text-muted-foreground hover:text-primary transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
              <li><Link to="/booking" className="text-muted-foreground hover:text-primary transition-colors">Book Appointment</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Services</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Consultation</li>
              <li>Panchakarma</li>
              <li>Ayurvedic Therapy</li>
              <li>Diet & Nutrition</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Contact</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4" aria-hidden="true" />
                <a href={`tel:${CONTACT_INFO.phone}`} className="hover:text-primary transition-colors">
                  {CONTACT_INFO.phone}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4" aria-hidden="true" />
                <span className="break-all">{CONTACT_INFO.email}</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4" aria-hidden="true" />
                {CONTACT_INFO.location}
              </li>
            </ul>
            <div className="mt-3 text-xs text-muted-foreground">
              <p>{BUSINESS_HOURS.morning}</p>
              <p>{BUSINESS_HOURS.evening}</p>
            </div>
            <div className="flex gap-2 mt-4">
              <a href={`tel:${CONTACT_INFO.phone}`} className="inline-flex items-center gap-1 px-3 py-1 bg-primary text-primary-foreground rounded-full text-xs hover:opacity-90 transition-opacity">
                <Phone className="w-3 h-3" aria-hidden="true" />
                Call
              </a>
              <a href={`https://wa.me/${CONTACT_INFO.whatsapp}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-full text-xs hover:opacity-90 transition-opacity">
                WhatsApp
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Kasturi Ayurveda. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
