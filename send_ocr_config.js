const payload = {
  "id": "hr-config-001",
  "company_id": "company-hr",
  "name": "Employee Records Extraction Config",
  "description": "Extract employee details and employment status for HR processing",
  "entities_config": {
      "employee_id": "Unique identifier for the employee (e.g., staff number, employee code)",
      "name": "Full name of the employee",
      "department": "Department or team where the employee works",
      "date_of_joining": "The date the employee joined the company",
      "salary": "Annual salary of the employee",
      "status": "Current employment status of the employee (active, on leave, resigned)"
  },
  "clauses_config": {
      "high_salary_check": "Determine if salary exceeds a defined threshold",
      "long_tenure_check": "Determine if employee has been with the company for over 5 years",
      "active_status_check": "Check if employee is currently active"
  }
};

async function send() {
  const url = "http://localhost:3000/api/v1/data/ocr/configurations";
  console.log("Sending to", url);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    console.log(res.status, text);
  } catch(e) {
    console.error(e);
  }
}

async function send2() {
  const url = "http://localhost:3000/abstraction/api/v1/data/ocr/configurations";
  console.log("Sending to", url);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    console.log(res.status, text);
  } catch(e) {
    console.error(e);
  }
}

send().then(() => send2());
