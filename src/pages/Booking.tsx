import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { startOfDay, addDays, isBefore, isAfter } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { API_URL } from "@/lib/api";
import { openRazorpayCheckout, RazorpayPaymentParams } from "@/lib/razorpay";

interface PublicDoctor {
  id: string;
  name: string;
  specialization: string;
  supportsOnline: boolean;
  slotDurationMins: number;
}

interface PublicConfig {
  consultationPriceDisplay: string;
  modes: string[];
  minNoticeMins: number;
  maxAdvanceDays: number;
  refundWindowHours: number;
  paymentsEnabled: boolean;
  holdMinutes: number;
}

type Mode = "in_person" | "online";
type PaymentMode = "pay_now" | "pay_at_clinic";

interface PendingPayment {
  id: string;
  accessToken: string;
  holdExpiresAt: string;
  payment: RazorpayPaymentParams;
}

const formatDateYYYYMMDD = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const formatISTTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" });

const formatISTDateTime = (iso: string): string =>
  new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const Booking = () => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    doctorId: "",
    date: undefined as Date | undefined,
    slotStart: "",
    name: "",
    age: "",
    phone: "",
    email: "",
    symptoms: ""
  });
  const [mode, setMode] = useState<Mode>("in_person");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [inPersonPaymentMode, setInPersonPaymentMode] = useState<PaymentMode>("pay_at_clinic");
  const [createdAppointment, setCreatedAppointment] = useState<{ id: string; accessToken: string } | null>(null);
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);
  const [isOpeningCheckout, setIsOpeningCheckout] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Online consultations are always paid up front; in-person can choose
  // once payments are live. The server enforces the same rules.
  const paymentMode: PaymentMode = mode === "online" ? "pay_now" : inPersonPaymentMode;

  const [doctors, setDoctors] = useState<PublicDoctor[]>([]);
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [isLoadingBookingInfo, setIsLoadingBookingInfo] = useState(true);
  const [bookingInfoError, setBookingInfoError] = useState<string | null>(null);

  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const loadBookingInfo = () => {
    setIsLoadingBookingInfo(true);
    setBookingInfoError(null);

    Promise.all([
      fetch(`${API_URL}/doctors`).then((r) => r.json()),
      fetch(`${API_URL}/config`).then((r) => r.json()),
    ])
      .then(([doctorsRes, configRes]) => {
        if (doctorsRes.status !== "success" || configRes.status !== "success") {
          throw new Error("Unexpected response from server");
        }

        const activeDoctors: PublicDoctor[] = doctorsRes.data;
        setDoctors(activeDoctors);
        setConfig(configRes.data);

        if (activeDoctors.length === 1) {
          setFormData((prev) => ({ ...prev, doctorId: activeDoctors[0].id }));
        }
      })
      .catch(() => {
        setBookingInfoError("Could not load booking details. Please check your connection and try again.");
      })
      .finally(() => {
        setIsLoadingBookingInfo(false);
      });
  };

  useEffect(() => {
    loadBookingInfo();
  }, []);

  useEffect(() => {
    if (!formData.date || !formData.doctorId) {
      setAvailableSlots([]);
      return;
    }

    setIsLoadingSlots(true);
    setSlotsError(null);
    const dateStr = formatDateYYYYMMDD(formData.date);

    fetch(`${API_URL}/availability?doctorId=${formData.doctorId}&date=${dateStr}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.status !== "success") throw new Error("Unexpected response from server");
        const slots: string[] = json.data.slots;
        setAvailableSlots(slots);
        setFormData((prev) => (prev.slotStart && !slots.includes(prev.slotStart) ? { ...prev, slotStart: "" } : prev));
      })
      .catch(() => {
        setSlotsError("Could not load available times. Please try again.");
      })
      .finally(() => {
        setIsLoadingSlots(false);
      });
  }, [formData.date, formData.doctorId]);

  const eligibleDoctors = mode === "online" ? doctors.filter((d) => d.supportsOnline) : doctors;

  const handleNext = () => {
    if (validateStep(step)) {
      if (step < 5) setStep(step + 1);
    }
  };

  const validateStep = (currentStep: number) => {
    switch (currentStep) {
      case 1:
        return mode !== "online" || consentAccepted;
      case 2:
        return formData.doctorId !== "";
      case 3:
        return !!formData.date && formData.slotStart !== "";
      case 4:
        return !!formData.name && !!formData.phone;
      default:
        return true;
    }
  };

  const startCheckout = async (pending: PendingPayment) => {
    setIsOpeningCheckout(true);
    try {
      await openRazorpayCheckout(
        pending.payment,
        {
          name: formData.name,
          email: formData.email || undefined,
          contact: formData.phone,
        },
        {
          // Not proof of payment: the booking page waits for the server to
          // confirm it via Razorpay's webhook.
          onSuccess: () => navigate(`/booking/${pending.id}?token=${pending.accessToken}`),
          onDismiss: () => setIsOpeningCheckout(false),
          onFailure: () => {
            toast({
              title: "Payment failed",
              description: "No money was taken. You can try again while your slot is held.",
              variant: "destructive",
            });
          },
        }
      );
    } catch (error) {
      setIsOpeningCheckout(false);
      toast({
        title: "Payment unavailable",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async () => {
    if (!formData.date || !formData.slotStart) return;

    setIsSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        doctorId: formData.doctorId,
        slotStart: formData.slotStart,
        mode,
        paymentMode,
        patient: {
          name: formData.name,
          phone: formData.phone,
          email: formData.email || undefined,
          age: formData.age ? parseInt(formData.age) : undefined,
          symptoms: formData.symptoms || undefined,
        },
      };
      if (mode === "online") {
        payload.consentAccepted = consentAccepted;
      }

      const response = await fetch(`${API_URL}/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to book appointment');
      }

      setCreatedAppointment({ id: data.data.id, accessToken: data.data.accessToken });

      if (data.data.payment) {
        const pending: PendingPayment = {
          id: data.data.id,
          accessToken: data.data.accessToken,
          holdExpiresAt: data.data.holdExpiresAt,
          payment: data.data.payment,
        };
        setPendingPayment(pending);
        setStep(5);
        void startCheckout(pending);
        return;
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

  const selectedDoctor = doctors.find((d) => d.id === formData.doctorId);

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
              {isLoadingBookingInfo && (
                <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-sm">Loading booking details...</span>
                </div>
              )}

              {!isLoadingBookingInfo && bookingInfoError && (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <AlertCircle className="w-8 h-8 text-destructive" />
                  <p className="text-sm text-muted-foreground">{bookingInfoError}</p>
                  <Button variant="outline" onClick={loadBookingInfo} className="rounded-full">
                    Try Again
                  </Button>
                </div>
              )}

              {!isLoadingBookingInfo && !bookingInfoError && (
              <>
              {step === 1 && (
                <div className="space-y-4">
                  <Label>Service</Label>
                  <div className="rounded-lg border p-4 flex items-center justify-between">
                    <span className="font-medium">Consultation</span>
                    {config && (
                      <span className="text-primary font-semibold">{config.consultationPriceDisplay}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Therapies and Panchakarma are planned with your doctor during the consultation and are not booked online.
                  </p>

                  {config && config.modes.length > 1 && (
                    <div className="space-y-3 pt-2">
                      <Label>Consultation mode</Label>
                      <Select
                        value={mode}
                        onValueChange={(value) => {
                          setMode(value as Mode);
                          setConsentAccepted(false);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in_person">In-person</SelectItem>
                          {config.modes.includes("online") && (
                            <SelectItem value="online">Online</SelectItem>
                          )}
                        </SelectContent>
                      </Select>

                      {mode === "in_person" && config.paymentsEnabled && (
                        <div className="space-y-3 pt-2">
                          <Label>Payment</Label>
                          <Select
                            value={inPersonPaymentMode}
                            onValueChange={(value) => setInPersonPaymentMode(value as PaymentMode)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pay_at_clinic">Pay at the clinic</SelectItem>
                              <SelectItem value="pay_now">Pay now online</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {mode === "online" && (
                        <p className="text-xs text-muted-foreground">Online consultations are paid in advance.</p>
                      )}

                      {mode === "online" && (
                        <div className="flex items-start gap-2 pt-1">
                          <Checkbox
                            id="consent"
                            checked={consentAccepted}
                            onCheckedChange={(checked) => setConsentAccepted(checked === true)}
                          />
                          <Label htmlFor="consent" className="text-sm font-normal leading-snug">
                            I consent to an online video consultation and understand the session will not be recorded.
                          </Label>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  {eligibleDoctors.length === 1 ? (
                    <div className="rounded-lg border p-4">
                      <Label className="block mb-1">Your doctor</Label>
                      <p className="font-medium">{eligibleDoctors[0].name}</p>
                      <p className="text-sm text-muted-foreground">{eligibleDoctors[0].specialization}</p>
                    </div>
                  ) : (
                    <>
                      <Label>Select your preferred doctor</Label>
                      <Select value={formData.doctorId} onValueChange={(value) => setFormData({...formData, doctorId: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a doctor" />
                        </SelectTrigger>
                        <SelectContent>
                          {eligibleDoctors.map((doctor) => (
                            <SelectItem key={doctor.id} value={doctor.id}>{doctor.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {eligibleDoctors.length === 0 && (
                        <p className="text-sm text-destructive">No doctors are currently available for this mode.</p>
                      )}
                    </>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <Label className="mb-2 block">Select Date</Label>
                    <Calendar
                      mode="single"
                      selected={formData.date}
                      onSelect={(date) => setFormData({...formData, date, slotStart: ""})}
                      disabled={(date) =>
                        isBefore(date, startOfDay(new Date())) ||
                        (config ? isAfter(date, addDays(new Date(), config.maxAdvanceDays)) : false)
                      }
                      className="rounded-lg border w-full"
                    />
                  </div>
                  <div>
                    <Label>Select Time</Label>
                    {!formData.date ? (
                      <p className="text-sm text-muted-foreground mt-2">Pick a date first.</p>
                    ) : isLoadingSlots ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading available times...
                      </div>
                    ) : slotsError ? (
                      <p className="text-sm text-destructive mt-2">{slotsError}</p>
                    ) : availableSlots.length === 0 ? (
                      <p className="text-sm text-muted-foreground mt-2">No slots available for this date. Please choose another day.</p>
                    ) : (
                      <Select value={formData.slotStart} onValueChange={(value) => setFormData({...formData, slotStart: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose time slot" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSlots.map((slot) => (
                            <SelectItem key={slot} value={slot}>{formatISTTime(slot)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
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

              {step === 5 && pendingPayment && (
                <div className="space-y-6">
                  <div className="text-center py-6">
                    <h3 className="text-2xl font-semibold mb-2">Complete your payment</h3>
                    <p className="text-muted-foreground">
                      Your slot is held until{" "}
                      <span className="font-medium text-foreground">{formatISTTime(pendingPayment.holdExpiresAt)}</span>.
                      It is only confirmed once the payment goes through.
                    </p>
                  </div>

                  <div className="bg-accent/30 rounded-lg p-6 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mode:</span>
                      <span className="font-medium">{mode === "online" ? "Online" : "In-person"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date & Time:</span>
                      <span className="font-medium">{formData.slotStart && formatISTDateTime(formData.slotStart)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="font-medium">₹{(pendingPayment.payment.amount / 100).toFixed(2)}</span>
                    </div>
                  </div>

                  <Button
                    className="w-full rounded-full"
                    onClick={() => startCheckout(pendingPayment)}
                    disabled={isOpeningCheckout}
                  >
                    {isOpeningCheckout ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Opening payment...
                      </>
                    ) : (
                      `Pay ₹${(pendingPayment.payment.amount / 100).toFixed(2)}`
                    )}
                  </Button>

                  <Link to={`/booking/${pendingPayment.id}?token=${pendingPayment.accessToken}`}>
                    <Button variant="outline" className="w-full rounded-full">
                      I've already paid: check my booking
                    </Button>
                  </Link>
                </div>
              )}

              {step === 5 && !pendingPayment && (
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
                      <span className="text-muted-foreground">Mode:</span>
                      <span className="font-medium">{mode === "online" ? "Online" : "In-person"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Doctor:</span>
                      <span className="font-medium">{selectedDoctor?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date & Time:</span>
                      <span className="font-medium">{formData.slotStart && formatISTDateTime(formData.slotStart)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Patient:</span>
                      <span className="font-medium">{formData.name}</span>
                    </div>
                  </div>

                  {createdAppointment && (
                    <Link to={`/booking/${createdAppointment.id}?token=${createdAppointment.accessToken}`}>
                      <Button variant="outline" className="w-full rounded-full">
                        View / Manage Your Booking
                      </Button>
                    </Link>
                  )}

                  <p className="text-sm text-muted-foreground text-center">
                    {formData.email
                      ? "A confirmation has been sent to your email. See you soon!"
                      : "Save the link above to manage or cancel your booking later."}
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
                      step === 4 ? (paymentMode === "pay_now" ? "Continue to Payment" : "Confirm Booking") : "Next"
                    )}
                  </Button>
                </div>
              )}
              </>
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
