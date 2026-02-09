import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

type FormState = {
  staff: string;
  substation: string;
  date: string;
  timeOut: string;
  timeReturned: string;
  purpose: string;
  workDone: string;
  materialsUsed: string;
  supervisorApproval: string;
};

export default function FieldActivityLog(): JSX.Element {
  const [form, setForm] = useState<FormState>({
    staff: '',
    substation: '',
    date: '',
    timeOut: '',
    timeReturned: '',
    purpose: '',
    workDone: '',
    materialsUsed: '',
    supervisorApproval: ''
  });

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  const navigate = useNavigate();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // submit to backend
    fetch(`${API_BASE_URL}/field-activities/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff: form.staff,
        substation: form.substation,
        date: form.date,
        time_out: form.timeOut,
        time_returned: form.timeReturned,
        purpose: form.purpose,
        work_done: form.workDone,
        materials_used: form.materialsUsed,
        supervisor_approval: form.supervisorApproval,
      }),
    })
      .then(res => res.json())
      .then(data => {
        if ((data && data.error) || !data) {
          alert('Error submitting: ' + (data.error || 'unknown'))
        } else {
          // navigate to activity reports to see the saved entry
          navigate('/activity-reports');
        }
      })
      .catch(err => {
        console.error(err);
        alert('Submission failed');
      });
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Field Activity / Substation Log</h1>
      <form className="mt-4 grid grid-cols-1 gap-4 max-w-2xl" onSubmit={handleSubmit}>
        <label className="flex flex-col">
          <span className="text-sm font-medium">Staff</span>
          <input className="border rounded p-2" value={form.staff} onChange={e => update('staff', e.target.value)} />
        </label>

        <label className="flex flex-col">
          <span className="text-sm font-medium">Substation name</span>
          <input className="border rounded p-2" value={form.substation} onChange={e => update('substation', e.target.value)} />
        </label>

        <label className="flex flex-col">
          <span className="text-sm font-medium">Date</span>
          <input type="date" className="border rounded p-2" value={form.date} onChange={e => update('date', e.target.value)} />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col">
            <span className="text-sm font-medium">Time out (from office)</span>
            <input type="time" className="border rounded p-2" value={form.timeOut} onChange={e => update('timeOut', e.target.value)} />
          </label>
          <label className="flex flex-col">
            <span className="text-sm font-medium">Time returned</span>
            <input type="time" className="border rounded p-2" value={form.timeReturned} onChange={e => update('timeReturned', e.target.value)} />
          </label>
        </div>

        <label className="flex flex-col">
          <span className="text-sm font-medium">Purpose of visit</span>
          <textarea className="border rounded p-2" value={form.purpose} onChange={e => update('purpose', e.target.value)} />
        </label>

        <label className="flex flex-col">
          <span className="text-sm font-medium">Work done</span>
          <textarea className="border rounded p-2" value={form.workDone} onChange={e => update('workDone', e.target.value)} />
        </label>

        <label className="flex flex-col">
          <span className="text-sm font-medium">Materials used</span>
          <textarea className="border rounded p-2" value={form.materialsUsed} onChange={e => update('materialsUsed', e.target.value)} />
        </label>

        <label className="flex flex-col">
          <span className="text-sm font-medium">Supervisor approval</span>
          <input className="border rounded p-2" value={form.supervisorApproval} onChange={e => update('supervisorApproval', e.target.value)} />
        </label>

        <div>
          <button type="submit" className="bg-gridco-700 text-white px-4 py-2 rounded">Submit</button>
        </div>
      </form>
    </div>
  );
}
