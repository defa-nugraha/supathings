<?php

namespace App\Console\Commands;

use App\Models\ActuatorCommand;
use App\Models\ActuatorSchedule;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class RunActuatorSchedules extends Command
{
    protected $signature = 'actuators:run-schedules';

    protected $description = 'Create actuator commands for schedules that are due';

    public function handle(): int
    {
        $now = now();
        $day = $now->dayOfWeek;
        $executed = 0;

        ActuatorSchedule::query()
            ->where('enabled', true)
            ->orderBy('id')
            ->each(function (ActuatorSchedule $schedule) use ($now, $day, &$executed): void {
                $days = is_array($schedule->days) ? array_map('intval', $schedule->days) : [];
                if (! in_array($day, $days, true)) {
                    return;
                }

                $scheduledAt = $now->copy()->setTimeFromTimeString((string) $schedule->time);
                if ($now->lt($scheduledAt)) {
                    return;
                }

                DB::transaction(function () use ($schedule, $scheduledAt, &$executed): void {
                    $locked = ActuatorSchedule::query()->lockForUpdate()->find($schedule->id);
                    if (! $locked || ! $locked->enabled) {
                        return;
                    }

                    if ($locked->last_run_at && Carbon::parse($locked->last_run_at)->gte($scheduledAt)) {
                        return;
                    }

                    ActuatorCommand::query()->create([
                        'iot_device_id' => $locked->iot_device_id,
                        'actuator' => $locked->actuator,
                        'state' => $locked->state,
                        'mode' => 'scheduled',
                        'status' => 'pending',
                        'issued_by' => $locked->created_by,
                        'metadata' => [
                            'trigger' => 'schedule',
                            'schedule_id' => $locked->id,
                            'scheduled_at' => $scheduledAt->toIso8601String(),
                        ],
                    ]);

                    $locked->forceFill(['last_run_at' => $scheduledAt])->save();
                    $executed++;
                });
            });

        $this->info("Executed {$executed} actuator schedule(s).");

        return self::SUCCESS;
    }
}
