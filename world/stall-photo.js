const PanpanStallPhoto=(()=>{
    async function image(source){
        const picture=new Image();
        const objectUrl=source instanceof Blob?URL.createObjectURL(source):null;
        picture.src=objectUrl??source;
        try{await picture.decode();return picture;}
        finally{if(objectUrl) URL.revokeObjectURL(objectUrl);}
    }

    function toBlob(canvas,type,quality){
        return new Promise((resolve,reject)=>canvas.toBlob(file=>{
            if(file) resolve(file);
            else reject(new Error('Could not save photo'));
        },type,quality));
    }

    async function portrait(file){
        const original=await image(file);
        const canvas=document.createElement('canvas');
        canvas.width=520;
        canvas.height=680;
        const ctx=canvas.getContext('2d');
        ctx.fillStyle='#fff7ee';
        ctx.roundRect(0,0,canvas.width,canvas.height,38);
        ctx.fill();
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(14,14,492,652,26);
        ctx.clip();
        const scale=Math.max(492/original.width,652/original.height);
        const width=original.width*scale;
        const height=original.height*scale;
        ctx.drawImage(original,(canvas.width-width)/2,(canvas.height-height)/2,width,height);
        ctx.restore();
        return canvas;
    }

    async function makePhoto(subject){
        const panpan=await image('../assets/panpan-2d/idle.webp');
        const sheet=document.createElement('canvas');
        sheet.width=1080;
        sheet.height=1240;
        const ctx=sheet.getContext('2d');
        ctx.fillStyle='#fff2e8';
        ctx.fillRect(0,0,sheet.width,sheet.height);
        const width=476;
        const height=526;
        const poses=[
            {colors:['#f5bbca','#fff0d5'],left:125,right:324,pan:416,top:39},
            {colors:['#b9ded5','#e9eff8'],left:144,right:329,pan:449,top:21},
            {colors:['#cfc3ec','#f8d9e4'],left:127,right:309,pan:406,top:48},
            {colors:['#f4c8a1','#f8e7cb'],left:143,right:320,pan:442,top:29},
        ];

        for(const [index,pose] of poses.entries()){
            const x=48+(index%2)*508;
            const y=42+Math.floor(index/2)*553;
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(x,y,width,height,24);
            ctx.clip();
            const backdrop=ctx.createLinearGradient(x,y,x+width,y+height);
            backdrop.addColorStop(0,pose.colors[0]);
            backdrop.addColorStop(1,pose.colors[1]);
            ctx.fillStyle=backdrop;
            ctx.fillRect(x,y,width,height);
            ctx.fillStyle='#ffffff43';
            for(const [dx,dy,r] of [[50,72,19],[396,37,13],[433,118,25],[76,402,11]]){
                ctx.beginPath();
                ctx.arc(x+dx,y+dy,r,0,Math.PI*2);
                ctx.fill();
            }
            const subjectHeight=388;
            const subjectWidth=subject.width*subjectHeight/subject.height;
            ctx.drawImage(subject,x+pose.right-subjectWidth/2,y+pose.top+20,subjectWidth,subjectHeight);
            const pandaWidth=panpan.width*pose.pan/panpan.height;
            ctx.drawImage(panpan,x+pose.left-pandaWidth/2,y+height+47-pose.pan,pandaWidth,pose.pan);
            ctx.restore();
        }
        ctx.textAlign='center';
        ctx.fillStyle='#743f4d';
        ctx.font='700 33px "Songti SC", serif';
        ctx.fillText('我和潘潘在榕树旁',540,1188);
        return toBlob(sheet,'image/png');
    }

    function show(body){
        body.innerHTML=`
            <form class="stall-question photo-form">
                <label for="stall-photo-file">选张照片，和潘潘拍四格大头贴</label>
                <input id="stall-photo-file" name="photo" type="file" accept="image/jpeg,image/png,image/webp" required>
                <p class="stall-status">照片在本机合成，保留原背景。</p>
                <button type="submit" class="text-button">开始拍</button>
            </form>
            <p class="stall-status" role="status"></p>
            <figure class="stall-photo-result" hidden>
                <img alt="你和潘潘的四格大头贴">
                <figcaption><a class="text-button" download="和潘潘的大头贴.png">下载大头贴</a></figcaption>
            </figure>`;
        const form=body.querySelector('form');
        const fileInput=form.elements.photo;
        const button=form.querySelector('button');
        const status=body.querySelector('.stall-status');
        const result=body.querySelector('figure');
        const controller=new AbortController();
        let photoUrl;
        let working=false;

        form.onsubmit=async event=>{
            event.preventDefault();
            const file=fileInput.files[0];
            if(!file||working) return;
            working=fileInput.disabled=button.disabled=true;
            status.textContent='潘潘站好了，机器正在出片……';
            try{
                const subject=await portrait(file);
                if(controller.signal.aborted) return;
                const photo=await makePhoto(subject);
                if(controller.signal.aborted) return;
                if(photoUrl) URL.revokeObjectURL(photoUrl);
                photoUrl=URL.createObjectURL(photo);
                result.querySelector('img').src=photoUrl;
                result.querySelector('a').href=photoUrl;
                result.hidden=false;
                status.textContent='';
            }catch(error){
                if(!controller.signal.aborted) status.textContent=error instanceof DOMException?
                    '这张照片打不开，换一张 JPG、PNG 或 WebP 试试。':'暂时没能出片，可以再试一次。';
            }finally{
                working=fileInput.disabled=button.disabled=false;
            }
        };
        return {close:()=>{
            controller.abort();
            if(photoUrl) URL.revokeObjectURL(photoUrl);
        }};
    }

    return {show};
})();
