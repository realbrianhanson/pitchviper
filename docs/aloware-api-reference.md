# Aloware API and Webhook Documentation

This document provides a comprehensive overview of the Aloware API and webhook functionalities for integration with PitchViper.

## Base URL
```
https://app.aloware.com
```

## API Quick Reference

| API | Method | Endpoint | Description |
|-----|--------|----------|-------------|
| SMS API | POST | `/api/v1/webhook/sms-gateway/send` | Send SMS and MMS messages |
| Lead API | POST | `/api/v1/webhook/forms` | Create or update contacts |
| Contact Lookup API | GET | `/api/v1/webhook/contact/phone-number` | Look up contact by phone number |
| Sequence Enroll API | POST | `/api/v1/webhook/sequence-enroll` | Enroll contact in a sequence |
| Sequence Disenroll API | POST | `/api/v1/webhook/sequence-disenroll` | Disenroll contact from sequences |
| Two-Legged Call API | POST | `/api/v1/webhook/two-legged-call` | Initiate direct phone calls |
| Power Dialer - Remove Contact | POST | `/api/v1/webhook/powerdialer-remove-contact-from-lists` | Remove contact from all power dialer lists |
| Power Dialer - Clear List | POST | `/api/v1/webhook/powerdialer-clear-list` | Remove all contacts from a power dialer list |
| Power Dialer - Clear User Lists | POST | `/api/v1/webhook/powerdialer-clear-user-lists` | Remove all contacts from a user's power dialer lists |
| Users API | GET | `/api/v1/webhook/users` | Get list of users and their statuses |

## Webhook Events Quick Reference

| Event | Description |
|-------|-------------|
| Contact created | New contact added in Aloware |
| Contact updated | Contact details changed |
| Contact disposed | Contact disposition modified |
| Contact DNC updated | Contact marked as Do Not Contact |
| Communication initiated | Communication with contact begins |
| Communication disposed | Communication disposition changes |
| Appointment saved | Appointment saved in Aloware |
| Call disposed | Call disposition details after completion |
| Voicemail saved | Voicemail saved |
| Recording saved | Call recording saved |
| Transcription saved | Call transcribed to text |
| Call summarized | AI-generated call summary created |

---

## 1. SMS API

**Endpoint:** `POST /api/v1/webhook/sms-gateway/send`

### Required Fields
| Field | Description |
|-------|-------------|
| api_token | Your Aloware account API token |
| from or line_id | The sender's phone number or Aloware Line ID |
| to | The recipient's phone number |
| message | The content of the SMS message (limited to 160 characters) |

### Optional Fields
| Field | Description |
|-------|-------------|
| image_url | (for MMS) The URL of the image to include in the MMS message |
| force_random | Set to 1 to ignore number stickiness feature |

### Example Request
```json
{
  "api_token": "740A6C4E",
  "from": "+18552562001",
  "to": "+18181234567",
  "message": "Hello, an SMS from Aloware."
}
```

### Response
- **HTTP 202** - Success

---

## 2. Lead API (Form Capture API)

**Endpoint:** `POST /api/v1/webhook/forms`

Creates new contacts or updates existing contacts within Aloware.

### Required Fields
| Field | Description |
|-------|-------------|
| api_token | Your Aloware account API token |
| phone_number | The phone number of the contact |

### Optional Fields
| Field | Description |
|-------|-------------|
| other_phone_numbers | Array of objects with label and phone_number |
| company_name | Company name |
| name | Full name |
| first_name | First name |
| last_name | Last name |
| lead_source | Lead source (e.g., "Google Ads") |
| email | Email address |
| date_of_birth | Date of birth in MM/DD/YYYY format |
| timezone | Timezone (e.g., "America/Los_Angeles") |
| city | City |
| state | State |
| zipcode | Zip code |
| country | Country |
| address | Street address |
| website | Website URL |
| notes | Notes |
| csf1, csf2 | Custom Fields 1 and 2 |
| user_id | User ID for ownership |
| distribute_to_ring_group | Boolean - distribute to ring group |
| ring_group_id | Ring group ID |
| check_available_users | Boolean - check for available users |
| check_available_users_with_fallback | Boolean - check available users with fallback |
| add_to_powerdialer | Boolean - add to PowerDialer |
| powerdialer_position | Position in PowerDialer ("top" or "bottom") |
| sequence_id | Sequence ID for enrollment |
| force_update_sequence | Boolean - force update sequence |
| force_update | Boolean - force update existing contact fields |
| line_id | Line ID |
| tag_id | Tag ID |
| disposition_status_id | Disposition status ID |

### Example Request
```json
{
  "api_token": "740A6C4E",
  "phone_number": "8181234567",
  "company_name": "Aloware",
  "name": "John Doe",
  "first_name": "John",
  "last_name": "Doe",
  "lead_source": "Google Ads",
  "email": "john.doe@gmail.com",
  "add_to_powerdialer": true,
  "powerdialer_position": "top",
  "force_update": true
}
```

### Response
- **HTTP 201** - Contact Created: `{"message": "Contact created."}`
- **HTTP 200** - Contact Updated (when force_update is true)
- **HTTP 400** - Invalid Request

**Important:** The `force_update` field is crucial. Unless it is set to true, existing contacts will not be updated if the corresponding contact field is already filled.

---

## 3. Contact Lookup API

**Endpoint:** `GET /api/v1/webhook/contact/phone-number`

### Query Parameters
| Parameter | Description | Required |
|-----------|-------------|----------|
| api_token | Your Aloware API token | Yes |
| phone_number | The phone number of the contact you want to look up | Yes |

### Example URL
```
GET https://app.aloware.com/api/v1/webhook/contact/phone-number?api_token=740A6C4E&phone_number=8181234567
```

### Response
- **HTTP 200** - Contact Found (returns contact information)
- **HTTP 404** - Contact Not Found: `{"error": "Contact not found."}`
- **HTTP 400** - Invalid Request

---

## 4. Sequence API

### Enroll a Contact
**Endpoint:** `POST /api/v1/webhook/sequence-enroll`

#### Required Fields
| Field | Description |
|-------|-------------|
| api_token | Your Aloware account API token |
| sequence_id | The ID of the sequence to enroll the contact |
| source | If source is a phone number, set to 'phone_number'. If from other platforms, use 'id' |
| phone_number | Required if source is 'phone_number' |
| id | Required if source is from platforms like Aloware, HubSpot, Zoho, Guesty, or Pipedrive |

#### Optional Fields
| Field | Description |
|-------|-------------|
| force_enroll | Boolean - if true, force enroll even if already in a sequence |

### Disenroll a Contact
**Endpoint:** `POST /api/v1/webhook/sequence-disenroll`

---

## 5. Two-Legged Call API

**Endpoint:** `POST /api/v1/webhook/two-legged-call`

Enables direct phone calls between contacts and agents.

### Required Fields
| Field | Description |
|-------|-------------|
| api_token | Your Aloware account API token |
| user_id or ring_group_id | Either the ID of the user or the inbox involved in the call |
| contact_phone_number or contact_id | The phone number or ID of the contact |
| line_phone_number or line_id | The phone number or ID of the Aloware line to initiate the call from |

### Optional Fields
| Field | Description |
|-------|-------------|
| user_phone_number | The phone number of the user if user_id is selected |

### Example Request
```json
{
  "api_token": "CC42FF74",
  "user_id": "1",
  "user_phone_number": "+18181234567",
  "contact_phone_number": "+18181276543",
  "line_phone_number": "+18552562001"
}
```

### Response
- **HTTP 202** - Success: `{"message": "Two-legged call established."}`
- **HTTP 422** - Validation Error

---

## 6. Power Dialer APIs

### Remove Contact from All Lists
**Endpoint:** `POST /api/v1/webhook/powerdialer-remove-contact-from-lists`

| Field | Description |
|-------|-------------|
| api_token | Your Aloware account API token |
| contact_id | The contact's ID |

### Clear Power Dialer List
**Endpoint:** `POST /api/v1/webhook/powerdialer-clear-list`

| Field | Description |
|-------|-------------|
| api_token | Your Aloware account API token |
| list_id | The Power Dialer list ID |

### Clear User's Power Dialer Lists
**Endpoint:** `POST /api/v1/webhook/powerdialer-clear-user-lists`

| Field | Description |
|-------|-------------|
| api_token | Your Aloware account API token |
| user_id | The Power Dialer owner user ID |

---

## 7. Users API

**Endpoint:** `GET /api/v1/webhook/users`

Retrieves the list of users and their statuses from your Aloware account.

### Example URL
```
GET https://app.aloware.com/api/v1/webhook/users?api_token=[API_TOKEN]
```

### Agent Status Codes
| Status Code | Status |
|-------------|--------|
| 0 | Offline |
| 1 | Available |
| 2 | Busy |
| 3 | On Break |
| 4 | On Call |
| 5 | Wrap-up |
| 6 | Ringing |

---

## 8. Webhook Integration

Aloware's webhook integration creates a direct bridge between Aloware and external systems. Webhooks send data instantly when specific events occur.

### Authentication Options
| Type | Description |
|------|-------------|
| None | No authentication mechanism |
| Basic | Username and password as base64-encoded string in Authorization header |
| Bearer | Bearer token in the Authorization header |

### Filter Options
| Filter | Description |
|--------|-------------|
| Direction | Inbound vs. outbound communication |
| Type | Calls, SMS, emails, notes, reminders |
| Disposition status | Completed, missed, failed, abandoned |
| Call duration | Minimum or maximum talk time thresholds |
| Qualified contacts | Only send data when conditions are met |
| Skip lines | Exclude events from certain phone lines |

---

## 9. Webhook Event: Transcription Saved

Triggered when a call is transcribed to text.

### Payload Includes
- The transcription file
- The date and time of the transcription
- Its status

---

## 10. Webhook Event: Call Summarized

Receives AI-generated call summaries alongside full transcriptions.

### Payload Example
```json
{
  "body": {
    "summary": "### Call Summary\n\nThe agent provided information about...",
    "transcription": {
      "id": 11299,
      "transcription_id": "7c51b5ce-16ca-4765-8224-3e7406d0fcd8",
      "driver": "assembly_ai",
      "communication_id": 373640,
      "user_id": "...",
      "status": "...",
      "custom_summary": "The AI-generated summary content",
      "summary_status": "...",
      "created_at": "..."
    }
  }
}
```

### Summary Sections Included
| Section | Description |
|---------|-------------|
| Call Summary | Overall summary of the call |
| Reason for the call | Primary reason the customer contacted the agent |
| Solutions offered by the agent | Solutions or suggestions the agent provided |
| Pitches offered by the agent | Promotional offers the agent presented |
| Actions taken during the call | Actions taken by both agent and customer |
| Call outcomes | Final resolution or next steps agreed upon |
| Agent action items after the call | Follow-up tasks for the agent |
| Customer action items after the call | Follow-up tasks for the customer |

### Transcription Object Fields
| Field | Description |
|-------|-------------|
| id | Unique transcription ID |
| transcription_id | UUID for the transcription |
| driver | Transcription service used (e.g., "assembly_ai") |
| communication_id | Associated communication ID |
| user_id | User ID who handled the call |
| status | Transcription status |
| summary_engine | Summary engine used |
| custom_summary | The AI-generated summary content |
| summary_prompt | The prompt used to generate the summary |
| summary_status | Status of the summary generation |
| summary_created_at | Timestamp when summary was created |
| created_at | Timestamp when transcription was created |
| updated_at | Timestamp when transcription was last updated |
| company_id | Company ID |

---

## Headers for All API Requests

```
Accept: application/json
Content-Type: application/json
```

## Support

For additional API functions or questions, contact support@aloware.com

---

*Document compiled for PitchViper integration reference*
