import ContactList from './components/ContactList';
import ContactUserProfile from './components/ContactUserProfile';

export default function ContactPage() {
  return (
    <div className="flex flex-1 gap-0.5 min-h-0">
      <ContactList />
      <ContactUserProfile />
    </div>
  );
}
