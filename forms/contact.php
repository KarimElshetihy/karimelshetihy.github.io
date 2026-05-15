<?php
declare(strict_types=1);

header("Content-Type: text/plain; charset=UTF-8");

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
  http_response_code(405);
  echo "Method Not Allowed";
  exit;
}

$receiving_email_address = "kmboy.km@gmail.com";

$name = trim((string)($_POST["name"] ?? ""));
$email = trim((string)($_POST["email"] ?? ""));
$subject = trim((string)($_POST["subject"] ?? ""));
$message = trim((string)($_POST["message"] ?? ""));

if ($name === "" || $email === "" || $subject === "" || $message === "") {
  http_response_code(400);
  echo "Please fill in all required fields.";
  exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
  http_response_code(400);
  echo "Please provide a valid email address.";
  exit;
}

$safeName = preg_replace("/[\r\n]+/", " ", $name) ?: $name;
$safeSubject = preg_replace("/[\r\n]+/", " ", $subject) ?: $subject;

$mailSubject = "Portfolio Contact: " . $safeSubject;
$mailBody = "You received a new message from your portfolio contact form.\n\n";
$mailBody .= "Name: " . $safeName . "\n";
$mailBody .= "Email: " . $email . "\n\n";
$mailBody .= "Message:\n" . $message . "\n";

$headers = [
  "From: " . $safeName . " <" . $email . ">",
  "Reply-To: " . $email,
  "MIME-Version: 1.0",
  "Content-Type: text/plain; charset=UTF-8"
];

$mailSent = mail($receiving_email_address, $mailSubject, $mailBody, implode("\r\n", $headers));

if (!$mailSent) {
  http_response_code(500);
  echo "Failed to send email. Please try again later.";
  exit;
}

echo "OK";
