$body = @{
    name = "Test Patient"
    phone = "9876543210"
    email = "test@example.com"
    service = "Consultation"
    appointmentDate = "2025-12-01"
    appointmentTime = "10:00 AM"
    symptoms = "Back pain"
} | ConvertTo-Json

$result = Invoke-RestMethod -Uri "http://localhost:5000/api/appointments" -Method POST -Body $body -ContentType "application/json"
Write-Output "✅ Appointment created!"
$result | ConvertTo-Json -Depth 5
