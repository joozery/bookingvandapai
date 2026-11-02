'use client';

import { Select } from '@base-ui/react/select';
import type { CSSProperties } from 'react';
import bankMetadata from '../../../../public/banks-logo-master/banks.json';
import { Check, ChevronDown, Landmark, QrCode, Store, Wallet } from 'lucide-react';

type BankOption = { value: string; label: string; logo?: string; kind?: 'promptpay' | 'wallet' | 'merchant' };

const banks: BankOption[] = [
  { value: '01002', label: 'ธนาคารกรุงเทพ', logo: 'bbl' },
  { value: '01004', label: 'ธนาคารกสิกรไทย', logo: 'kbank' },
  { value: '01006', label: 'ธนาคารกรุงไทย', logo: 'ktb' },
  { value: '01011', label: 'ธนาคารทหารไทยธนชาต', logo: 'ttb' },
  { value: '01014', label: 'ธนาคารไทยพาณิชย์', logo: 'scb' },
  { value: '01025', label: 'ธนาคารกรุงศรีอยุธยา', logo: 'bay' },
  { value: '01030', label: 'ธนาคารออมสิน', logo: 'gsb' },
  { value: '01034', label: 'ธ.ก.ส.', logo: 'baac' },
  { value: '01022', label: 'ธนาคารซีไอเอ็มบีไทย', logo: 'cimb' },
  { value: '01024', label: 'ธนาคารยูโอบี', logo: 'uob' },
  { value: '01067', label: 'ธนาคารทิสโก้', logo: 'tisco' },
  { value: '01069', label: 'ธนาคารเกียรตินาคินภัทร', logo: 'kk' },
  { value: '01070', label: 'ธนาคารไอซีบีซี (ไทย)', logo: 'icbc' },
  { value: '01071', label: 'ธนาคารไทยเครดิต', logo: 'tcrb' },
  { value: '01073', label: 'ธนาคารแลนด์ แอนด์ เฮ้าส์', logo: 'lhb' },
];
const otherAccounts: BankOption[] = [
  { value: '02001', label: 'พร้อมเพย์ · เบอร์โทรศัพท์', kind: 'promptpay' },
  { value: '02003', label: 'พร้อมเพย์ · บัตรประชาชน / เลขผู้เสียภาษี', kind: 'promptpay' },
  { value: '02004', label: 'พร้อมเพย์ · e-Wallet', kind: 'wallet' },
  { value: '03000', label: 'บัญชีร้านค้า / Merchant', kind: 'merchant' },
  { value: '04000', label: 'TrueMoney Wallet', kind: 'wallet' },
];

function bankColor(option?: BankOption) {
  return option?.logo ? bankMetadata.th[option.logo as keyof typeof bankMetadata.th]?.color || '#7c3aed' : '#7c3aed';
}

function AccountIcon({ option }: { option?: BankOption }) {
  if (option?.logo) return <span aria-hidden="true" className="h-8 w-8 shrink-0 rounded-lg bg-center bg-no-repeat shadow-sm" style={{ backgroundColor: bankColor(option), backgroundSize: '76%', backgroundImage: `url('/banks-logo-master/th/${option.logo}.svg')` }} />;
  const Icon = option?.kind === 'promptpay' ? QrCode : option?.kind === 'wallet' ? Wallet : option?.kind === 'merchant' ? Store : Landmark;
  return <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600"><Icon className="h-4 w-4" /></span>;
}

export default function BankReceiverSelect({ value, onChange, disabled, required }: {
  value: string; onChange: (value: string) => void; disabled: boolean; required: boolean;
}) {
  const options = [...banks, ...otherAccounts];
  const known = options.find(option => option.value === value);
  const selected: BankOption | undefined = known || (value ? { value, label: `บัญชีที่ตั้งไว้ (${value})` } : undefined);
  const items = selected && !known ? [...options, selected] : options;
  const renderOption = (option: BankOption) => <Select.Item key={option.value} value={option.value} label={option.label} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none data-[highlighted]:bg-[var(--bank-tint)] data-[selected]:bg-[var(--bank-tint)]" style={{ '--bank-tint': `${bankColor(option)}14` } as CSSProperties}>
    <AccountIcon option={option} />
    <Select.ItemText className="min-w-0 flex-1 break-words">{option.label}</Select.ItemText>
    <Select.ItemIndicator className="ml-auto shrink-0 text-purple-700"><Check className="h-4 w-4" /></Select.ItemIndicator>
  </Select.Item>;

  return <div className="min-w-0">
    <Select.Root value={value || null} onValueChange={next => onChange(next || '')} items={items} disabled={disabled} required={required} name="receiverType">
      <Select.Label className="text-xs font-bold text-slate-600">ธนาคาร / บัญชีผู้รับที่ใช้ตรวจสลิป</Select.Label>
      <Select.Trigger className="mt-1.5 flex min-h-12 w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-800 outline-none transition-colors hover:border-purple-300 focus-visible:border-purple-500 focus-visible:ring-2 focus-visible:ring-purple-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60" style={selected?.logo ? { borderColor: `${bankColor(selected)}70`, backgroundColor: `${bankColor(selected)}08` } : undefined}>
        <AccountIcon option={selected} />
        <Select.Value className="min-w-0 flex-1 break-words">{selected ? selected.label : <span className="text-slate-400">เลือกธนาคารหรือพร้อมเพย์</span>}</Select.Value>
        <Select.Icon className="shrink-0 text-slate-400"><ChevronDown className="h-4 w-4" /></Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner sideOffset={6} alignItemWithTrigger={false} className="z-[100] outline-none">
          <Select.Popup className="w-[var(--anchor-width)] max-w-[calc(100vw_-_2rem)] overflow-hidden rounded-2xl border border-purple-100 bg-white p-1.5 shadow-xl shadow-purple-950/15 outline-none">
            <Select.List className="max-h-[min(360px,var(--available-height))] overflow-y-auto overscroll-contain">
              <Select.Group>
                <Select.GroupLabel className="px-3 pb-1 pt-2 text-[10px] font-bold text-slate-400">ธนาคาร</Select.GroupLabel>
                {banks.map(renderOption)}
              </Select.Group>
              <Select.Group>
                <Select.GroupLabel className="mt-2 border-t border-slate-100 px-3 pb-1 pt-3 text-[10px] font-bold text-slate-400">พร้อมเพย์และบัญชีอื่น</Select.GroupLabel>
                {otherAccounts.map(renderOption)}
                {selected && !known && renderOption(selected)}
              </Select.Group>
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  </div>;
}
