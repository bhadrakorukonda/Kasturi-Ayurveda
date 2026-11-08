import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, FileText, User, Clock, LogIn, Loader2, LogOut, Mail, Phone } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { API_URL } from "@/lib/api";

interface Appointment {
  _id: string;
  doctorId?: { _id: string; name: string; specialization?: string } | string;
  slotStart: string;
  slotEnd: string;
  mode: "in_person" | "online";
  paymentMode: "pay_now" | "pay_at_clinic";
  paymentStatus: "unpaid" | "paid" | "refunded" | "failed" | "needs_manual_refund";
  // Optional: pre-Phase-3 legacy documents don't have this sub-object.
  patient?: {
    name: string;
    phone: string;
    email?: string;
    age?: number;
    symptoms?: string;
  };
  status: "pending_payment" | "confirmed" | "completed" | "cancelled" | "no_show";
  createdAt: string;
}

interface ContactMessage {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  status: "new" | "read" | "responded";
  createdAt: string;
}

const formatSlotIST = (iso?: string): { date: string; time: string } => {
  if (!iso) return { date: "—", time: "—" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "—", time: "—" };
  return {
    date: d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }),
    time: d.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" }),
  };
};

const getDoctorName = (doctorId: Appointment["doctorId"]): string => {
  if (doctorId && typeof doctorId === "object") return doctorId.name;
  return "—";
};

const appointmentStatusBadgeVariant = (status: Appointment["status"]) => {
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

const Dashboard = () => {
  const { toast } = useToast();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(localStorage.getItem("adminToken"));
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [contacts, setContacts] = useState<ContactMessage[]>([]);
  const [stats, setStats] = useState({
    totalAppointments: 0,
    confirmedAppointments: 0,
    completedAppointments: 0,
    newMessages: 0
  });

  useEffect(() => {
    if (token) {
      setIsLoggedIn(true);
      fetchData();
    }
  }, [token]);

  const fetchData = async () => {
    try {
      const [appointmentsRes, contactsRes] = await Promise.all([
        fetch(`${API_URL}/appointments`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_URL}/contact`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (appointmentsRes.ok) {
        const appointmentsData = await appointmentsRes.json();
        setAppointments(appointmentsData.data || []);
        
        const confirmed = appointmentsData.data?.filter((a: Appointment) => a.status === "confirmed").length || 0;
        const completed = appointmentsData.data?.filter((a: Appointment) => a.status === "completed").length || 0;

        setStats(prev => ({
          ...prev,
          totalAppointments: appointmentsData.data?.length || 0,
          confirmedAppointments: confirmed,
          completedAppointments: completed
        }));
      }

      if (contactsRes.ok) {
        const contactsData = await contactsRes.json();
        setContacts(contactsData.data || []);
        const newMsgs = contactsData.data?.filter((c: ContactMessage) => c.status === "new").length || 0;
        setStats(prev => ({ ...prev, newMessages: newMsgs }));
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      localStorage.setItem("adminToken", data.token);
      setToken(data.token);
      setIsLoggedIn(true);
      toast({ title: "Login successful!", description: "Welcome to admin dashboard" });
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Invalid credentials",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    setToken(null);
    setIsLoggedIn(false);
    setAppointments([]);
    setContacts([]);
    toast({ title: "Logged out successfully" });
  };

  const updateAppointmentStatus = async (id: string, status: string) => {
    try {
      const response = await fetch(`${API_URL}/appointments/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        toast({ title: "Status updated successfully" });
        fetchData();
      }
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Failed to update appointment status",
        variant: "destructive"
      });
    }
  };

  const updateContactStatus = async (id: string, status: string) => {
    try {
      const response = await fetch(`${API_URL}/contact/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        toast({ title: "Message status updated" });
        fetchData();
      }
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Failed to update message status",
        variant: "destructive"
      });
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="pt-24 pb-12 px-4">
          <div className="container mx-auto max-w-md">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-serif text-center flex items-center justify-center gap-2">
                  <LogIn className="w-6 h-6" />
                  Admin Login
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      placeholder="admin@kasturiayurveda.com"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Password</Label>
                    <Input
                      type="password"
                      placeholder="Enter password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full rounded-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      "Login"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-serif font-bold mb-2">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">Manage appointments and messages</p>
            </div>
            <Button onClick={handleLogout} variant="outline" className="rounded-full">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">{stats.totalAppointments}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Confirmed</p>
                    <p className="text-2xl font-bold">{stats.confirmedAppointments}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold">{stats.completedAppointments}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <Mail className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">New Messages</p>
                    <p className="text-2xl font-bold">{stats.newMessages}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Appointments Table */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Appointments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground">
                          No appointments found
                        </TableCell>
                      </TableRow>
                    ) : (
                      appointments.map((apt) => {
                        const slot = formatSlotIST(apt.slotStart);
                        return (
                        <TableRow key={apt._id}>
                          <TableCell className="font-medium">{apt.patient?.name ?? "—"}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {apt.patient?.phone ?? "—"}
                              </div>
                              {apt.patient?.email && (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Mail className="w-3 h-3" />
                                  {apt.patient.email}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{apt.mode === "online" ? "Online" : "In-person"}</Badge>
                          </TableCell>
                          <TableCell>{getDoctorName(apt.doctorId)}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{slot.date}</div>
                              <div className="text-muted-foreground">{slot.time}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{apt.paymentMode === "pay_at_clinic" ? "Pay at clinic" : "Pay now"}</div>
                              <div className="text-muted-foreground">{apt.paymentStatus}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={appointmentStatusBadgeVariant(apt.status)}>
                              {apt.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={apt.status}
                              onValueChange={(value) => updateAppointmentStatus(apt._id, value)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="confirmed">Confirmed</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                                <SelectItem value="no_show">No Show</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Contact Messages Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                Contact Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          No messages found
                        </TableCell>
                      </TableRow>
                    ) : (
                      contacts.map((contact) => (
                        <TableRow key={contact._id}>
                          <TableCell className="font-medium">{contact.name}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {contact.email}
                              </div>
                              {contact.phone && (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Phone className="w-3 h-3" />
                                  {contact.phone}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{contact.subject || "-"}</TableCell>
                          <TableCell className="max-w-xs truncate">{contact.message}</TableCell>
                          <TableCell className="text-sm">
                            {new Date(contact.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                contact.status === "new"
                                  ? "default"
                                  : contact.status === "read"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {contact.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={contact.status}
                              onValueChange={(value) => updateContactStatus(contact._id, value)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="new">New</SelectItem>
                                <SelectItem value="read">Read</SelectItem>
                                <SelectItem value="responded">Responded</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Dashboard;
