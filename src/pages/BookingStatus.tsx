import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API_URL } from "@/lib/api";

interface PatientAppointmentView {
  id: string;
  doctorName?: string;
  specialization?: string;
  slotStart: string;
  slotEnd: string;
  mode: "in_person" | "online";
  paymentMode: "pay_now" | "pay_at_clinic";
  status: "pending_payment" | "confirmed" | "completed" | "cancelled" | "no_show";
  amountDue: number;
  currency: string;
  meetLink?: string;
  patientName?: string;
  cancellable: boolean;
}

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

const statusBadgeVariant = (status: PatientAppointmentView["status"]) => {
  switch (status) {
    case "confirmed":
      return "default" as const;
    case "completed":
      return "outline" as const;
    case "cancelled":
    case "no_show":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
};

const statusLabel = (status: PatientAppointmentView["status"]) => {
  switch (status) {
    case "pending_payment":
      return "Awaiting Payment";
    case "no_show":
      return "No Show";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
};

const BookingStatus = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { toast } = useToast();

  const [appointment, setAppointment] = useState<PatientAppointmentView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const loadAppointment = () => {
    setIsLoading(true);
    setLoadError(null);

    fetch(`${API_URL}/appointments/${id}?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok || json.status !== "success") {
          throw new Error(json.message || "This link is invalid or has expired.");
        }
        setAppointment(json.data);
      })
      .catch((error) => {
        setLoadError(error instanceof Error ? error.message : "This link is invalid or has expired.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    if (!id || !token) {
      setLoadError("This link is invalid or has expired.");
      setIsLoading(false);
      return;
    }
    loadAppointment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  const handleCancel = async () => {
    setIsCancelling(true);
    setCancelError(null);

    try {
      const response = await fetch(`${API_URL}/appointments/${id}/cancel?token=${encodeURIComponent(token)}`, {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not cancel this appointment.");
      }

      setAppointment(data.data);
      toast({ title: "Appointment cancelled" });
    } catch (error) {
      setCancelError(error instanceof Error ? error.message : "Could not cancel this appointment.");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-xl">
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-center mb-8">Your Booking</h1>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-serif">Appointment Status</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading && (
                <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-sm">Loading your booking...</span>
                </div>
              )}

              {!isLoading && loadError && (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <AlertCircle className="w-8 h-8 text-destructive" />
                  <p className="text-sm text-muted-foreground">{loadError}</p>
                </div>
              )}

              {!isLoading && !loadError && appointment && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={statusBadgeVariant(appointment.status)}>{statusLabel(appointment.status)}</Badge>
                  </div>

                  <div className="bg-accent/30 rounded-lg p-6 space-y-3">
                    {appointment.patientName && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Patient:</span>
                        <span className="font-medium">{appointment.patientName}</span>
                      </div>
                    )}
                    {appointment.doctorName && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Doctor:</span>
                        <span className="font-medium">{appointment.doctorName}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mode:</span>
                      <span className="font-medium">{appointment.mode === "online" ? "Online" : "In-person"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date & Time:</span>
                      <span className="font-medium">{formatISTDateTime(appointment.slotStart)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payment:</span>
                      <span className="font-medium">
                        {appointment.paymentMode === "pay_at_clinic" ? "Pay at clinic" : "Paid online"}
                        {" · ₹"}
                        {(appointment.amountDue / 100).toFixed(2)}
                      </span>
                    </div>
                    {appointment.meetLink && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Meet Link:</span>
                        <a href={appointment.meetLink} className="font-medium text-primary underline">
                          Join
                        </a>
                      </div>
                    )}
                  </div>

                  {cancelError && <p className="text-sm text-destructive text-center">{cancelError}</p>}

                  {appointment.cancellable && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full rounded-full" disabled={isCancelling}>
                          {isCancelling ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Cancelling...
                            </>
                          ) : (
                            "Cancel Appointment"
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancel this appointment?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This cannot be undone. You'll need to book a new slot if you change your mind.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep appointment</AlertDialogCancel>
                          <AlertDialogAction onClick={handleCancel}>Yes, cancel it</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}

                  {!appointment.cancellable && appointment.status === "confirmed" && (
                    <p className="text-xs text-muted-foreground text-center">
                      This appointment is too close to cancel online. Please call the clinic if you need to make changes.
                    </p>
                  )}
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

export default BookingStatus;
