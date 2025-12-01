import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Star } from "lucide-react";

const Doctors = () => {
  const doctors = [
    {
      name: "Dr. Meera Sharma",
      specialization: "Ayurvedic Nutrition Specialist",
      experience: "15+ years",
      bio: "Expert in personalized diet plans and nutritional therapy. Specializes in digestive health and weight management through Ayurvedic principles.",
      rating: 4.9,
      image: "👩‍⚕️"
    },
    {
      name: "Dr. Anil Kumar",
      specialization: "Panchakarma Expert",
      experience: "20+ years",
      bio: "Renowned for traditional detoxification therapies and rejuvenation treatments. Trained in authentic Panchakarma techniques.",
      rating: 4.8,
      image: "👨‍⚕️"
    },
    {
      name: "Dr. Priya Reddy",
      specialization: "Skin & Wellness Expert",
      experience: "12+ years",
      bio: "Specializes in Ayurvedic dermatology and holistic beauty treatments. Expert in treating chronic skin conditions naturally.",
      rating: 4.9,
      image: "👩‍⚕️"
    },
    {
      name: "Dr. Rajesh Verma",
      specialization: "Stress & Mental Wellness",
      experience: "18+ years",
      bio: "Focuses on managing stress, anxiety, and mental health through Ayurvedic therapies, meditation, and lifestyle modifications.",
      rating: 4.7,
      image: "👨‍⚕️"
    },
    {
      name: "Dr. Lakshmi Iyer",
      specialization: "Women's Health Specialist",
      experience: "14+ years",
      bio: "Dedicated to women's health including hormonal balance, fertility, and postpartum care using natural Ayurvedic methods.",
      rating: 4.9,
      image: "👩‍⚕️"
    },
    {
      name: "Dr. Suresh Patel",
      specialization: "Joint & Pain Management",
      experience: "22+ years",
      bio: "Expert in treating arthritis, joint pain, and musculoskeletal disorders through Ayurvedic therapies and herbal treatments.",
      rating: 4.8,
      image: "👨‍⚕️"
    }
  ];

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-8 max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-serif font-bold mb-3">Our Ayurvedic Experts</h1>
            <p className="text-base text-muted-foreground">
              Meet our team of highly qualified and experienced Ayurvedic practitioners 
              dedicated to your health and wellbeing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {doctors.map((doctor, index) => (
              <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  <div className="bg-accent/30 p-8 text-center">
                    <div className="text-6xl mb-4">{doctor.image}</div>
                    <div className="flex items-center justify-center gap-1 mb-2">
                      <Star className="w-4 h-4 fill-primary text-primary" />
                      <span className="font-semibold">{doctor.rating}</span>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <h3 className="text-xl font-serif font-semibold mb-1">{doctor.name}</h3>
                    <p className="text-sm text-primary font-medium mb-2">{doctor.specialization}</p>
                    <p className="text-sm text-muted-foreground mb-3">{doctor.experience} of experience</p>
                    <p className="text-sm mb-4">{doctor.bio}</p>
                    <Link to="/booking">
                      <Button className="w-full rounded-full" variant="outline">
                        Book Appointment
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Doctors;
