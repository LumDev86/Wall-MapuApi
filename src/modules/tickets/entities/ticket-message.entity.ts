import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Ticket } from './ticket.entity';
import { User } from '../../users/entities/user.entity';

@Entity('ticket_messages')
export class TicketMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Ticket, (ticket) => ticket.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticketId' })
  ticket: Ticket;

  @Column()
  ticketId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @Column()
  senderId: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ default: false })
  isAdminReply: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
