import { IsIn, IsString, MinLength } from 'class-validator';

export class SendMessageDto {
  @IsIn(['clinic', 'patient'])
  sender!: 'clinic' | 'patient';

  @IsString()
  @MinLength(1)
  body!: string;
}
