import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const Booking = () => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    service: "",
    doctor: "",
    date: undefined as Date | undefined,
    time: "",
    name: "",
    age: "",
    phone: "",
    email: "",
    symptoms: ""
  });
  const { toast } = useToast();

  const services = ["Consultation", "Panchakarma", "Ayurvedic Therapy", "Diet & Nutrition Plan"];
  const doctors = ["Dr. Meera Sharma", "Dr. Anil Kumar", "Dr. Priya Reddy"];
  const timeSlots = ["9:00 AM", "10:00 AM", "11:00 AM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM"];

  const handleNext = () => {
    if (validateStep(step)) {
      if (step < 5) setStep(step + 1);
    }
  };

  const validateStep = (currentStep: number) => {
    switch (currentStep) {
      case 1:
        return formData.service !== "";
      case 2:
        return formData.doctor !== "";
      case 3:
        return formData.date && formData.time !== "";
      case 4:
        return formData.name && formData.phone;
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    if (!formData.date) return;
    
    setIsSubmitting(true);
    
    try {
      const appointmentData = {
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone,
        service: formData.service,
        preferredDoctor: formData.doctor,
        appointmentDate: formData.date.toISOString().split('T')[0], // YYYY-MM-DD format
        appointmentTime: formData.time,
        symptoms: formData.symptoms || undefined,
        age: formData.age ? parseInt(formData.age) : undefined
      };

      const response = await fetch(`${API_URL}/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appointmentData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to book appointment');
      }

      toast({
        title: "Appointment Booked!",
        description: "You will receive a confirmation email shortly.",
      });
      setStep(5);
    } catch (error) {
      toast({
        title: "Booking Failed",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { number: 1, label: "Service" },
    { number: 2, label: "Doctor" },
    { number: 3, label: "Date & Time" },
    { number: 4, label: "Details" },
    { number: 5, label: "Confirm" }
  ];

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-center mb-3">Book Appointment</h1>
          <p className="text-center text-sm text-muted-foreground mb-8">Simple steps to start your healing journey</p>

          {/* Progress Indicator */}
          <div className="flex justify-between mb-8">
            {steps.map((s) => (
              <div key={s.number} className="flex flex-col items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                  step >= s.number ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {step > s.number ? <Check className="w-5 h-5" /> : s.number}
                </div>
                <span className="text-xs text-center hidden sm:block">{s.label}</span>
              </div>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-serif">
                {step === 1 && "Select Service"}
                {step === 2 && "Choose Doctor"}
                {step === 3 && "Pick Date & Time"}
                {step === 4 && "Patient Details"}
                {step === 5 && "Confirmation"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {step === 1 && (
                <div className="space-y-4">
                  <Label>Select the service you need</Label>
                  <Select value={formData.service} onValueChange={(value) => setFormData({...formData, service: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a service" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service} value={service}>{service}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <Label>Select your preferred doctor</Label>
                  <Select value={formData.doctor} onValueChange={(value) => setFormData({...formData, doctor: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors.map((doctor) => (
                        <SelectItem key={doctor} value={doctor}>{doctor}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <Label className="mb-2 block">Select Date</Label>
                    <Calendar
                      mode="single"
                      selected={formData.date}
                      onSelect={(date) => setFormData({...formData, date})}
                      disabled={(date) => date < new Date()}
                      className="rounded-lg border w-full"
                    />
                  </div>
                  <div>
                    <Label>Select Time</Label>
                    <Select value={formData.time} onValueChange={(value) => setFormData({...formData, time: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose time slot" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <div>
                    <Label>Full Name</Label>
                    <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Enter your name" />
                  </div>
                  <div>
                    <Label>Age</Label>
                    <Input type="number" value={formData.age} onChange={(e) => setFormData({...formData, age: e.target.value})} placeholder="Your age" />
                  </div>
                  <div>
                    <Label>Phone Number</Label>
                    <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="+91 98765 43210" />
                  </div>
                  <div>
                    <Label>Email (Optional)</Label>
                    <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="your@email.com" />
                  </div>
                  <div>
                    <Label>Symptoms / Concerns</Label>
                    <Textarea value={formData.symptoms} onChange={(e) => setFormData({...formData, symptoms: e.target.value})} placeholder="Brief description of your health concerns" rows={4} />
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-6">
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                      <Check className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <h3 className="text-2xl font-semibold mb-2">Appointment Confirmed!</h3>
                    <p className="text-muted-foreground mb-6">Your booking has been successfully scheduled.</p>
                  </div>

                  <div className="bg-accent/30 rounded-lg p-6 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Service:</span>
                      <span className="font-medium">{formData.service}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Doctor:</span>
                      <span className="font-medium">{formData.doctor}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date:</span>
                      <span className="font-medium">{formData.date?.toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Time:</span>
                      <span className="font-medium">{formData.time}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Patient:</span>
                      <span className="font-medium">{formData.name}</span>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground text-center">
                    A confirmation has been sent to your phone. See you soon!
                  </p>
                </div>
              )}

              {step < 5 && (
                <div className="flex gap-4 mt-8">
                  {step > 1 && (
                    <Button 
                      variant="outline" 
                      onClick={() => setStep(step - 1)} 
                      className="flex-1 rounded-full"
                      disabled={isSubmitting}
                    >
                      Back
                    </Button>
                  )}
                  <Button 
                    onClick={step === 4 ? handleSubmit : handleNext} 
                    className="flex-1 rounded-full"
                    disabled={!validateStep(step) || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Booking...
                      </>
                    ) : (
                      step === 4 ? "Confirm Booking" : "Next"
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Booking;
