import React, { useState } from 'react';
import './FormBuilder.css';

const FIELD_TYPES = [
  { value: 'text',        label: 'Text Input' },
  { value: 'dropdown',    label: 'Dropdown' },
  { value: 'checkbox',    label: 'Checkbox' },
  { value: 'file upload', label: 'File Upload' },
];

const makeId = () => `f_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
const emptyField = () => ({ _tempId: makeId(), label: '', fieldType: 'text', required: false, options: [] });

const FormBuilder = ({ fields, onChange, locked }) => {
  const [optionDraft, setOptionDraft] = useState({});

  const add    = ()        => onChange([...fields, emptyField()]);
  const remove = (id)      => onChange(fields.filter(f => (f._tempId || f._id || f.label) !== id));
  const update = (id, k, v)=> onChange(fields.map(f => getKey(f) === id ? { ...f, [k]: v } : f));
  const getKey = (f)       => f._tempId || f._id || f.label;

  const move = (idx, dir) => {
    const arr = [...fields];
    const to  = idx + dir;
    if (to < 0 || to >= arr.length) return;
    [arr[idx], arr[to]] = [arr[to], arr[idx]];
    onChange(arr);
  };

  const addOption = (id) => {
    const val = (optionDraft[id] || '').trim();
    if (!val) return;
    const f = fields.find(f => getKey(f) === id);
    if ((f.options || []).includes(val)) return;
    update(id, 'options', [...(f.options || []), val]);
    setOptionDraft(p => ({ ...p, [id]: '' }));
  };

  const removeOption = (id, opt) => {
    const f = fields.find(f => getKey(f) === id);
    update(id, 'options', (f.options || []).filter(o => o !== opt));
  };

  if (locked) return (
    <div className="fb-locked">
      <span>🔒</span>
      <span>Form is locked — registrations have been received. Fields cannot be changed.</span>
      {fields.length > 0 && (
        <ul className="fb-locked-list">
          {fields.map((f, i) => (
            <li key={i}><strong>{f.label}</strong> ({f.fieldType}){f.required ? ' — required' : ' — optional'}</li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="fb-wrap">
      <div className="fb-head">
        <span className="fb-head-title">Registration Form</span>
      </div>

      {fields.length === 0 && (
        <div className="fb-empty">No fields yet — click <strong>+ Add Field</strong> to start.</div>
      )}

      <div className="fb-list">
        {fields.map((field, idx) => {
          const id = getKey(field);
          return (
            <div key={id} className="fb-card">
              <div className="fb-card-inner">
                {/* Reorder */}
                <div className="fb-order">
                  <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0}>↑</button>
                  <button type="button" onClick={() => move(idx, 1)}  disabled={idx === fields.length - 1}>↓</button>
                </div>

                {/* Fields */}
                <div className="fb-inputs">
                  <div className="fb-row3">
                    <div className="fb-col fb-col-grow">
                      <label>Label *</label>
                      <input type="text" value={field.label} 
                        onChange={e => update(id, 'label', e.target.value)} />
                    </div>
                    <div className="fb-col">
                      <label>Type</label>
                      <select value={field.fieldType} onChange={e => update(id, 'fieldType', e.target.value)}>
                        {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                  </div>

                  {field.fieldType === 'dropdown' && (
                    <div className="fb-opts">
                      <label>Options</label>
                      <div className="fb-chips">
                        {(field.options || []).map((opt, i) => (
                          <span key={i} className="fb-chip">
                            {opt}
                            <button type="button" onClick={() => removeOption(id, opt)}>×</button>
                          </span>
                        ))}
                        {(field.options || []).length === 0 && <span className="fb-no-opts">No options yet</span>}
                      </div>
                      <div className="fb-opt-add">
                        <input type="text" 
                          value={optionDraft[id] || ''}
                          onChange={e => setOptionDraft(p => ({ ...p, [id]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addOption(id))} />
                        <button type="button" onClick={() => addOption(id)}>Add</button>
                      </div>
                    </div>
                  )}

                  {field.fieldType === 'file upload' && (
                    <p className="fb-note">Participants upload a file during registration.</p>
                  )}
                  {field.fieldType === 'checkbox' && (
                    <p className="fb-note">Participant checks a box to confirm/agree.</p>
                  )}
                </div>

                {/* Remove */}
                <button type="button" className="fb-del" onClick={() => remove(id)} title="Remove">🗑</button>
              </div>
            </div>
          );
        })}
      </div>

      <button type="button" className="fb-add" onClick={add}>+ Add Field</button>
    </div>
  );
};

export default FormBuilder;