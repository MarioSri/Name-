import { SocketService } from './socketService';
import { RealtimeService } from './realtimeService';

export class RealtimeIntegration {
  constructor(private socketService: SocketService) {
    this.setupRealtimeListeners();
  }

  private setupRealtimeListeners() {
    // Listen to document changes and broadcast via Socket.IO
    RealtimeService.subscribeToDocuments((payload) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;
      
      switch (eventType) {
        case 'INSERT':
          this.socketService.emitToDocument(newRecord.id, 'document:created', newRecord);
          break;
        case 'UPDATE':
          this.socketService.emitToDocument(newRecord.id, 'document:updated', newRecord);
          break;
        case 'DELETE':
          this.socketService.emitToDocument(oldRecord.id, 'document:deleted', oldRecord);
          break;
      }
    });
  }
}