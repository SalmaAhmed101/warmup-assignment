const fs = require("fs");

// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime, endTime) {
    // TODO: Implement this function
    let startSecs=timeToSeconds(startTime);
    let endSecs=timeToSeconds(endTime);


    let durationSecs=endSecs-startSecs;
    //Midnight fix: if duration is negative, the endtime is on the next day
    if(durationSecs<0)
    {
        durationSecs+=86400; //24*3600
    }

    return formatDuration(durationSecs);
}

//format time
function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    //formatted string like "2:05:09"
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

//convert time to seconds
function timeToSeconds(timeStr) {
    const parts = timeStr.toLowerCase().split(' ');
    const time = parts[0];
    const period = parts[1]; //undefined if no AM/PM is present

    let [hours, minutes, seconds] = time.split(':').map(Number);

    if (period) {
        if (period === 'pm' && hours !== 12) {
            hours += 12;
        } else if (period === 'am' && hours === 12) {
            hours = 0;
        }
    }

    return (hours * 3600) + (minutes * 60) + (seconds || 0);
}
// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {
    // TODO: Implement this function
    const DELIVERY_START = 28800;  // (8 am)
    const DELIVERY_END = 79200;   // (10 PM)

    let startSecs=timeToSeconds(startTime);
    let endSecs=timeToSeconds(endTime);

    // Handle cross-midnight shifts
    if (endSecs < startSecs) {
        endSecs += 86400; 
    }

    let idleTime=0;

    if(startSecs<DELIVERY_START)
    {
        // We only count up to 8 AM or the end of the shift, whichever is first
        let morningIdleEnd = Math.min(endSecs, DELIVERY_START);
        idleTime += (morningIdleEnd - startSecs);
    }
    if(endSecs>DELIVERY_END)
    {
        // We only count from 10 PM or the start of the shift, whichever is last
        let eveningIdleStart = Math.max(startSecs, DELIVERY_END);
        idleTime += (endSecs - eveningIdleStart);
    }
    return formatDuration(idleTime);
}

// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {
    // TODO: Implement this function
    const shiftSecs=timeToSeconds(shiftDuration);
    const idleSecs=timeToSeconds(idleTime);

    let activeSecs=shiftSecs-idleSecs;

    if (activeSecs < 0) {
        activeSecs = 0;
    }
    return formatDuration(activeSecs);
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {
    // TODO: Implement this function
    let[year,month,day]=date.split('-').map(Number);
    let activeSecs=timeToSeconds(activeTime);

    const dailyMinSecs=30240; //8h 24m
    const eidMinSecs=21600; //6h
    
    if(year===2025 && month===4 && (day>=10 && day<=30))
    {
        return activeSecs >= eidMinSecs;
    }
    
    return activeSecs >= dailyMinSecs;
    
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {
    // TODO: Implement this function
    //Read file and split into lines
    const content= fs.readFileSync(textFile, 'utf8').trimEnd()
    let lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    const{driverID,driverName,date,startTime,endTime}=shiftObj;

    for(let i=1;i<lines.length;i++)
    {
        const columns=lines[i].split(',');

        if(columns[0]==driverID && columns[2]==date)
        {
            return {};
        }
    }

    const shiftDuration = getShiftDuration(startTime, endTime);
    const idleTime = getIdleTime(startTime, endTime);
    const activeTime = getActiveTime(shiftDuration, idleTime);
    const quotaMet = metQuota(date, activeTime);
    const hasBonus = false;
    
    const newRecordObj = {
        driverID,
        driverName,
        date,
        startTime,
        endTime,
        shiftDuration,
        idleTime,
        activeTime,
        metQuota: quotaMet,
        hasBonus
    };
    
    const newRow = `${driverID},${driverName},${date},${startTime},${endTime},${shiftDuration},${idleTime},${activeTime},${quotaMet},${hasBonus}`;
    
    let insertIndex=-1;
    for(let i=lines.length-1;i>=1;i--)
    {
        if(lines[i].split(',')[0]== driverID)
        {
            insertIndex=i+1;
            break;
        }
    }
    if (insertIndex === -1) {
        lines.push(newRow); // Driver not found, add to end
    } else {
        lines.splice(insertIndex, 0, newRow); // Driver found, insert after last record
    }
    //Write back to file and return the object
    fs.writeFileSync(textFile, lines.join('\n') + '\n');
    return newRecordObj;
}

// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {
    // TODO: Implement this function
    const content= fs.readFileSync(textFile, 'utf8').trimEnd()
    let lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    let found =false;
    for(let i=1;i<lines.length;i++)
    {
        const columns=lines[i].split(',');

        if(columns[0]==driverID && columns[2]==date)
        {
            found=true;

            columns[9]=newValue;

            //save it back to the lines array
            lines[i] = columns.join(',');
            break;
        }
    }
    if(!found)
    {
        console.log('Driver not found');
        return;
    }
        

    fs.writeFileSync(textFile, lines.join('\n') + '\n');
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
    // TODO: Implement this function
    const content= fs.readFileSync(textFile, 'utf8').trimEnd()
    let lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let count=0;
    let flag=false;
   
    for(let i=1;i<lines.length;i++)
    {
        const columns=lines[i].split(',');

        if(columns[0]==driverID)
        {
            flag=true;

            const dateParts = columns[2].split('-');
            const readMonth = Number(dateParts[1]);

            if(readMonth===Number(month) && columns[9]==='true')
            {
                count++;
            }
        }
    }
    if(!flag)
    {
        return -1;
    }
        return count;
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    // TODO: Implement this function
    const content= fs.readFileSync(textFile, 'utf8').trimEnd()
    let lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    let total=0;
    
    for(let i=1;i<lines.length;i++)
    {
        const columns=lines[i].split(',');

        if(columns[0]==driverID)
        {

            const dateParts = columns[2].split('-');
            const readMonth = Number(dateParts[1]);

            if(readMonth===Number(month))
            {
                total+=timeToSeconds(columns[7]);
            }
        }
    }
    return formatDuration(total);
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {
    // TODO: Implement this function
    const shiftContent= fs.readFileSync(textFile, 'utf8').trimEnd()
    let shiftLines = shiftContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    const rateContent= fs.readFileSync(rateFile, 'utf8').trimEnd()
    let rateLines = rateContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    let dayOff="";
    for(let i=1;i<rateLines.length;i++)
    {
        const cols=rateLines[i].split(',');
        if(cols[0]===driverID)
        {
            dayOff=cols[1].trim();
            break;
        }
    }

    let TotalRequiredSeconds=0;
    let found=false;

    for(let i=1;i<shiftLines.length;i++)
    {
        const cols=shiftLines[i].split(',');

        if(cols[0]==driverID)
        {
            found=true;

            const dateParts = cols[2].split('-');
            const readYear=Number(dateParts[0]);
            const readMonth = Number(dateParts[1]);
            const readDay=Number(dateParts[2])

            if(readMonth===month)
            {
                const dateObj = new Date(cols[2]+ 'T00:00:00');
                const weekday = dateObj.toLocaleString('en-us', { weekday: 'long' });

                if(weekday!==dayOff)
                {
                    if(readYear===2025 && readMonth===4 && readDay>=10 && readDay<=30)
                    {
                        TotalRequiredSeconds+=(6*3600); //6 hours
                    }
                    else
                    {
                        TotalRequiredSeconds+=(8*3600)+(24*60); //8h 24m
                    }
                }
            }
        }
    }
    if (!found) return -1;

    TotalRequiredSeconds -= (bonusCount * 2 * 3600);

   
    if (TotalRequiredSeconds < 0) TotalRequiredSeconds = 0;

    return formatDuration(TotalRequiredSeconds);
}

// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {
    // TODO: Implement this function
    return 0;
}

module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};
