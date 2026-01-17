import { useState } from 'react';
import { Search, User, Building2, Phone, Mail, Loader2, X, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useContactLookup, AlowareContact } from '@/hooks/useContactLookup';
import { cn } from '@/lib/utils';

interface ContactLookupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectContact?: (contact: AlowareContact) => void;
}

export function ContactLookupModal({ open, onOpenChange, onSelectContact }: ContactLookupModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'phone' | 'name' | 'email'>('phone');
  const { isSearching, contacts, searchContacts, clearSearch } = useContactLookup();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    const params = {
      phoneNumber: searchType === 'phone' ? searchQuery : undefined,
      email: searchType === 'email' ? searchQuery : undefined,
      name: searchType === 'name' ? searchQuery : undefined,
    };

    await searchContacts(params);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSelectContact = (contact: AlowareContact) => {
    onSelectContact?.(contact);
    onOpenChange(false);
    setSearchQuery('');
    clearSearch();
  };

  const handleClose = () => {
    onOpenChange(false);
    setSearchQuery('');
    clearSearch();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Contact Lookup
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search type tabs */}
          <div className="flex gap-2">
            {(['phone', 'name', 'email'] as const).map((type) => (
              <Button
                key={type}
                variant={searchType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSearchType(type)}
                className="capitalize"
              >
                {type}
              </Button>
            ))}
          </div>

          {/* Search input */}
          <div className="flex gap-2">
            <Input
              placeholder={
                searchType === 'phone' ? 'Enter phone number...' :
                searchType === 'email' ? 'Enter email address...' :
                'Enter name...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}>
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Results */}
          {contacts.length > 0 && (
            <ScrollArea className="h-[300px] border rounded-lg">
              <div className="p-2 space-y-2">
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className={cn(
                      "p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                    )}
                    onClick={() => handleSelectContact(contact)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-primary" />
                          <span className="font-medium">{contact.fullName || 'Unknown'}</span>
                        </div>
                        
                        {contact.company && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Building2 className="h-3 w-3" />
                            <span>{contact.company}</span>
                            {contact.title && <span>• {contact.title}</span>}
                          </div>
                        )}
                        
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                          {contact.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              <span>{contact.phone}</span>
                            </div>
                          )}
                          {contact.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              <span>{contact.email}</span>
                            </div>
                          )}
                        </div>

                        {contact.tags && contact.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {contact.tags.slice(0, 3).map((tag, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {contact.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{contact.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Empty state */}
          {!isSearching && contacts.length === 0 && searchQuery && (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Search for contacts in Aloware</p>
              <p className="text-sm">by phone, name, or email</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
