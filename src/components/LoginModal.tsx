import { Check, ChevronRight } from 'lucide-react';

type LoginUser = {
  userId: string;
  displayName: string;
  pictureUrl: string;
};

type LoginModalProps = {
  open: boolean;
  users: LoginUser[];
  customName: string;
  customPicture: string;
  onSelectUser: (user: LoginUser) => void;
  onCustomNameChange: (value: string) => void;
  onCustomPictureChange: (value: string) => void;
  onCustomSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
};

const profilePictures = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
];

export default function LoginModal({
  open,
  users,
  customName,
  customPicture,
  onSelectUser,
  onCustomNameChange,
  onCustomPictureChange,
  onCustomSubmit,
  onClose,
}: LoginModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 text-slate-800">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-line" />
        <div className="text-center mb-5">
          <span className="inline-flex items-center justify-center bg-line text-white w-11 h-11 rounded-2xl shadow-md mb-3 font-extrabold text-2xl">L</span>
          <h3 className="text-base sm:text-lg font-bold text-slate-800">LINE Login Simulator</h3>
          <p className="text-xs text-slate-500 mt-1 leading-normal font-semibold">จำลองการเข้าสู่ระบบ LINE สำหรับทดสอบระบบ</p>
        </div>

        <div className="space-y-2 mb-5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">บัญชีสำหรับทดสอบด่วน:</span>
          <div className="grid grid-cols-1 gap-2">
            {users.map((user) => (
              <button key={user.userId} onClick={() => onSelectUser(user)} className="flex items-center space-x-3 w-full bg-slate-50 hover:bg-purple-50/50 border border-slate-200 hover:border-purple-200 p-2 rounded-xl text-left transition duration-150">
                <img src={user.pictureUrl} alt={user.displayName} className="w-9 h-9 rounded-full border border-slate-100 object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-800">{user.displayName}</div>
                  <span className="text-[9px] text-green-600 font-semibold block -mt-0.5">LINE Member Account</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            ))}
          </div>
        </div>

        <div className="relative flex py-2 items-center mb-4">
          <div className="flex-grow border-t border-slate-100" />
          <span className="flex-shrink mx-3 text-[9px] font-bold text-slate-400 uppercase tracking-wider">กำหนดชื่อเอง</span>
          <div className="flex-grow border-t border-slate-100" />
        </div>

        <form onSubmit={onCustomSubmit} className="space-y-4">
          <div>
            <label htmlFor="custom-name" className="block text-[10px] font-bold text-slate-500 mb-1.5">ชื่อบัญชีผู้ใช้</label>
            <input type="text" id="custom-name" required value={customName} onChange={(event) => onCustomNameChange(event.target.value)} placeholder="เช่น ชื่อผู้ใช้งาน" className="w-full bg-slate-50 border border-slate-200 focus:border-brand-700 rounded-xl px-3 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-100 transition duration-200" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-2">เลือกรูปโปรไฟล์</label>
            <div className="flex items-center space-x-3 overflow-x-auto pb-1.5">
              {profilePictures.map((url) => (
                <button type="button" key={url} onClick={() => onCustomPictureChange(url)} className={`relative rounded-full border-2 overflow-hidden shrink-0 ${customPicture === url ? 'border-brand-700 scale-105 shadow' : 'border-slate-100 hover:border-slate-200'}`}>
                  <img src={url} className="w-8 h-8 object-cover" alt="avatar" />
                  {customPicture === url && <div className="absolute inset-0 bg-brand-700/20 flex items-center justify-center"><Check className="w-2.5 h-2.5 text-white" /></div>}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2.5 pt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold py-2.5 rounded-xl transition duration-200">ยกเลิก</button>
            <button type="submit" className="flex-1 bg-line hover:bg-line-hover text-white text-xs font-bold py-2.5 rounded-xl transition duration-200 shadow-sm">ยืนยันล็อกอิน</button>
          </div>
        </form>
      </div>
    </div>
  );
}
